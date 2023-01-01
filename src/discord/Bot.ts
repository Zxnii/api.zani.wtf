import { Channel, Client, Collection } from "discord.js";
import { FastifyBaseLogger } from "fastify";
import ApiServer from "../ApiServer";
import BotChannels from "./BotChannels";

export default class Bot {
    private readonly logger: FastifyBaseLogger;
    private readonly client: Client;

    private readonly namedChannels: Collection<string, Channel>;

    public constructor() {
        this.client = new Client({
            intents: [
                "Guilds",
                "GuildMembers",
                "GuildMessages",
                "MessageContent"
            ]
        });

        this.logger = ApiServer.getLogger();
        this.namedChannels = new Collection();
    }

    public async login(): Promise<void> {
        await this.client.login(process.env["DISCORD_TOKEN"]);
        await Promise.all([
            this.cacheNamedChannel(process.env["GEN_CHANNEL_ID"]!, "image_gen_channel")
        ]);

        this.logger.info(`Logged in as ${this.client.user!.tag}`);
    }

    private async cacheNamedChannel(id: string, name: BotChannels): Promise<void> {
        try {
            const channel = this.client.channels.cache.get(id) ?? await this.client.channels.fetch(id);

            if (channel) {
                this.namedChannels.set(name, channel);
                this.logger.info(`Pre-cached named channel ${name}`)
            } else {
                this.logger.error("Failed to pre-cache channel.");
            }
        } catch (e) {
            this.logger.error("Failed to pre-cache channel:", e);
        }
    }

    public getNamedChannel<T extends Channel>(name: BotChannels): T | undefined {
        return <T | undefined>this.namedChannels.get(name);
    }

    public getClient(): Client {
        return this.client;
    }
}