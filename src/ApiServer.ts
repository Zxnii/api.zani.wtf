import fastifyWebsocket, { SocketStream } from "@fastify/websocket";
import commandLineArgs from "command-line-args";
import { Collection } from "discord.js";
import fastify, { FastifyBaseLogger, FastifyInstance } from "fastify";
import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import Bot from "./discord/Bot";
import ServerEndpoint from "./ServerEndpoint";
import Util from "./Util";
import ImageGenerationHandler from "./ws/handlers/ImageGenerationHandler";
import WebsocketHandler from "./ws/handlers/WebsocketHandler";
import WebsocketHandshake from "./ws/WebsocketHandshake";
import WebsocketWrapper from "./ws/WebsocketWrapper";

export default class ApiServer {
    private static readonly COMMAND_MAPPINGS: Record<string, typeof WebsocketHandler> = {
        "gen_image": ImageGenerationHandler
    };

    private static instance: ApiServer;
    private static logger: FastifyBaseLogger;

    private readonly bot: Bot;

    private fastifyServer: FastifyInstance;

    public constructor() {
        ApiServer.instance = this;

        this.fastifyServer = fastify({ logger: true });
        ApiServer.logger = this.fastifyServer.log;

        this.registerRoutes();

        this.bot = new Bot();

        void this.initialize();
    }

    private async initialize(): Promise<void> {
        const args = commandLineArgs([
            { name: "port", alias: "p", type: Number, defaultValue: !Util.isDev() ? 8002 : 3001 }
        ]);

        const port = args["port"];

        ApiServer.logger.info("Connecting to MongoDB");

        await mongoose.connect(<string>(process.env[Util.isDev() ? "DEV_MONGO_URI" : "MONGO_URI"] ?? process.env["MONGO_URI"]), { dbName: "zani-wtf" });

        ApiServer.logger.info("Connected to MongoDB");

        await this.fastifyServer.listen({
            port
        });

        ApiServer.logger.info(`API server listening on port ${port}`);

        await this.bot.login();
    }

    private collectRoutes(prefix: string = "/", routePrefix: string = "/", routes: Collection<string, ServerEndpoint> = new Collection()): Collection<string, ServerEndpoint> {
        const endpointPath = path.join(__dirname, "endpoints");
        const fullPath = path.join(endpointPath, prefix);
        const files = fs.readdirSync(fullPath);

        for (const file of files) {
            const filePath = path.join(fullPath, file);
            const urlParameter = /\[(.*)]/.exec(file);

            let cleanedName = file;

            if (urlParameter) {
                cleanedName = cleanedName.replace(urlParameter[0], `:${urlParameter[1]}`);
            }

            if (fs.statSync(filePath).isDirectory()) {
                this.collectRoutes(path.join(prefix, file), path.join(routePrefix, cleanedName), routes);
            } else {
                if (!file.endsWith(".js")) {
                    continue;
                }

                try {
                    const EndpointConstructor = require(filePath).default;
                    const endpoint = new EndpointConstructor();

                    if (cleanedName === "index.js") {
                        routes.set(routePrefix.replace(/\\/g, "/"), endpoint);
                    } else {
                        routes.set(path.join(routePrefix, cleanedName.replace(".js", "")).replace(/\\/g, "/"), endpoint);
                    }
                } catch (e) {
                    ApiServer.logger.error(`Error while loading ${path.join(routePrefix, cleanedName.replace(".js", "")).replace(/\\/g, "/")}: ${e}`);
                }
            }
        }

        return routes;
    }

    private registerRoutes(): void {
        this.fastifyServer.register(fastifyWebsocket);
        this.fastifyServer.register(async (fastify): Promise<void> => {
            const routes = this.collectRoutes();

            fastify.get("/ws", { websocket: true }, async (connection: SocketStream) => {
                const websocket = connection.socket;
                const websocketWrapper = new WebsocketWrapper(connection);

                const handshakePacket = await websocketWrapper.awaitData(10000);

                try {
                    const handshake = <WebsocketHandshake>JSON.parse(handshakePacket.toString());

                    if ("command" in handshake && handshake.command in ApiServer.COMMAND_MAPPINGS) {
                        const command = handshake.command;

                        const Handler = <{ new(): WebsocketHandler }>ApiServer.COMMAND_MAPPINGS[command];
                        const handler = new Handler();

                        await handler.handle(handshake, websocketWrapper, websocket);

                        websocket.close(1000);
                    }
                } catch (e) {
                    ApiServer.logger.error(e);
                }
            });

            for (const [route, handler] of routes.entries()) {
                fastify.log.info(`Registering route ${route}`);

                if (route === "/_404") {
                    fastify.setNotFoundHandler((request, response) => {
                        if (request.method.toLowerCase() in handler) {
                            return (<any>handler)[request.method.toLowerCase()](request, response);
                        }
                    });
                } else {
                    fastify.all(route, (request, response) => {
                        if (request.method.toLowerCase() in handler) {
                            return (<any>handler)[request.method.toLowerCase()](request, response);
                        }
                    });
                }
            }
        });
    }

    public getBot(): Bot {
        return this.bot;
    }

    public static getLogger(): FastifyBaseLogger {
        return ApiServer.logger;
    }

    public static getInstance(): ApiServer {
        return this.instance;
    }
}
