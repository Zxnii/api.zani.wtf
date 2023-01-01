import { FastifyBaseLogger } from "fastify";
import WebSocket from "ws";
import ApiServer from "../../ApiServer";
import WebsocketHandshake from "../WebsocketHandshake";
import WebsocketWrapper from "../WebsocketWrapper";

export default abstract class WebsocketHandler {
    protected readonly logger: FastifyBaseLogger;

    protected constructor() {
        this.logger = ApiServer.getLogger();
    }

    public abstract handle(handshake: WebsocketHandshake, wrapper: WebsocketWrapper, socket: WebSocket): Promise<any>;
}
