import { Client, GuildTextBasedChannel, Message } from "discord.js";
import { setTimeout as wait } from "timers/promises";
import WebSocket from "ws";
import ApiServer from "../../ApiServer";
import Queue from "../../queues/Queue";
import WebsocketHandshake from "../WebsocketHandshake";
import WebsocketWrapper from "../WebsocketWrapper";
import WebsocketHandler from "./WebsocketHandler";
import fetch from "node-fetch";

export default class ImageGenerationHandler extends WebsocketHandler {
    private static readonly generationQueue: Queue<null> = new Queue<null>();

    private readonly generationQueue: Queue<null> = ImageGenerationHandler.generationQueue;

    private readonly discordClient: Client;
    private readonly imageGenChannel?: GuildTextBasedChannel;

    public constructor() {
        super();

        const bot = ApiServer.getInstance().getBot();

        this.discordClient = bot.getClient();
        this.imageGenChannel = bot.getNamedChannel<GuildTextBasedChannel>("image_gen_channel");
    }

    public async handle(handshake: WebsocketHandshake<{ prompt: string }>, wrapper: WebsocketWrapper, socket: WebSocket): Promise<any> {
        if ("prompt" in handshake) {
            this.logger.info(`Generating image using prompt: ${handshake.prompt}`);

            let queuePos = this.generationQueue.getNextQueueLength();

            const popHandler = () => {
                queuePos--;

                if (queuePos > 0) {
                    socket.send(JSON.stringify({ status: `You are #${queuePos} in queue`, queuePosition: queuePos }));
                } else {
                    socket.send(JSON.stringify({ status: "Your image is being generated now..", queuePosition: 0 }));

                    this.generationQueue.off("pop", popHandler);
                }
            }

            if (queuePos > 0) {
                socket.send(JSON.stringify({ status: `You are #${queuePos} in queue`, queuePosition: queuePos }));

                this.generationQueue.on("pop", popHandler);
            } else {
                socket.send(JSON.stringify({ status: "Your image is being generated now..", queuePosition: 0 }));
            }

            await this.generationQueue.awaitNext();

            this.generationQueue.push(null);

            const result = await this.generateImage(handshake.prompt);

            this.generationQueue.pop();

            if ("data" in result) {
                socket.send(JSON.stringify({
                    src: `data:image/png;base64,${result.data.toString("base64")}`
                }));

                socket.close(1000);
            } else {
                socket.send(JSON.stringify({
                    error: "Image generation failed"
                }));

                socket.close(1000);
            }
        } else {
            socket.send(JSON.stringify({
                error: "Expected \"prompt\" to be a string within handshake packet, but it was not found."
            }));

            socket.close(1002);
        }
    }

    private async generateImage(prompt: string): Promise<{ data: Buffer } | { error: unknown }> {
        if (this.imageGenChannel) {
            const flags = prompt.match(/-o(\S+)/g);

            let cleanedPrompt = prompt;

            if (flags) {
                flags.forEach(flag => {
                    cleanedPrompt = cleanedPrompt.replace(flag, "");
                });
            }

            const requestMessage = await this.imageGenChannel.send(`<@${process.env["GEN_BOT"]}> diffuse ${prompt}`);

            const message = <Message | undefined>await Promise.race([
                new Promise(resolve => {
                    const listener = (message: Message) => {
                        if (message.author.id === process.env["GEN_BOT"] && message.reference && message.reference.messageId === requestMessage.id) {
                            this.logger.info(`Got response to ${requestMessage.id}`);
                            this.discordClient.off("messageCreate", listener);

                            resolve(message);
                        }
                    };

                    this.discordClient.on("messageCreate", listener);
                }),
                wait(60000)
            ]);

            if (message) {
                const attachment = message.attachments.first();

                if (attachment) {
                    const response = await fetch(attachment.url);
                    const responseData = Buffer.from(await response.arrayBuffer());

                    return {
                        data: responseData
                    };
                }
            } else {
                return { error: "Failed to generate image" };
            }
        }

        return { error: "Failed to generate image" };
    }
}