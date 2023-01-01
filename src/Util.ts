export default class Util {
    public static isDev(): boolean {
        return process.env.NODE_ENV === "development";
    }
}