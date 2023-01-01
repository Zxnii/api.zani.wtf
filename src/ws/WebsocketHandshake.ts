import AvailableCommands from "./AvailableCommands";

type WebsocketHandshake<T = {}, C = AvailableCommands> = {
    command: C
} | ({
    command: C
} & T);

export default WebsocketHandshake;