import EventEmitter from "events";
import TypedEventEmitter from "typed-emitter";
import QueueEvents from "./QueueEvents";

export default class Queue<T> extends (EventEmitter as new () => TypedEventEmitter<QueueEvents>) {
    private readonly queued: T[] = [];
    private readonly nextQueue: ((() => void) | null)[] = [];

    public constructor() {
        super();

        this.on("pop", () => {
            if (this.nextQueue.length > 0) {
                let next = this.nextQueue.shift();

                while (!next && this.nextQueue.length > 0) {
                    next = this.nextQueue.shift();
                }

                if (next) {
                    next();
                }
            }
        });
    }

    public push(element: T): void {
        this.queued.push(element);
    }

    public pop(): void {
        this.queued.shift();

        this.emit("pop");
    }

    public awaitEnd(): Promise<void> {
        return new Promise(resolve => {
            if (this.queued.length === 0) {
                resolve();
            } else {
                const listener = () => {
                    if (this.queued.length === 0) {
                        this.off("pop", listener);

                        resolve();
                    }
                }

                this.on("pop", listener);
            }
        });
    }

    public awaitNext(): Promise<void> {
        return new Promise(resolve => {
            if (this.nextQueue.length === 0) {
                resolve();
                this.nextQueue.push(null);
            } else {
                this.nextQueue.push(resolve);
            }
        });
    }

    public getQueueLength(): number {
        return this.queued.length;
    }

    public getNextQueueLength(): number {
        return this.nextQueue.length;
    }
}