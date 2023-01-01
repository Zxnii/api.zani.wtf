import { SocketStream } from "@fastify/websocket";
import WebSocket from "ws";

export default class WebsocketWrapper {
    private readonly socket: WebSocket;

    constructor(socket: SocketStream) {
        this.socket = socket.socket;
    }

    public awaitData(timeout?: number): Promise<string | Buffer> {
        const dataPromise = new Promise<string | Buffer>((resolve, reject) => {
            const errorHandler = (err: unknown) => {
                reject(err);

                this.socket.off("message", handler);
                this.socket.off("error", errorHandler);
            }

            const handler = (data: string | Buffer) => {
                resolve(data);

                this.socket.off("message", handler);
                this.socket.off("error", errorHandler);
            }

            this.socket.on("message", handler);
            this.socket.on("error", errorHandler);
        });

        if (timeout) {
            return Promise.race<string | Buffer>([
                dataPromise,
                new Promise((_resolve, reject) => {
                    setTimeout(() => {
                        reject("Timeout exceeded");
                    }, timeout);
                })
            ]);
        } else {
            return dataPromise;
        }
    }

    public getSocket(): WebSocket {
        return this.socket;
    }
}