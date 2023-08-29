export interface ILogger {
    command(success: boolean): void;
    error(error: string | Error, properties?: any): void;
    warning(message: string): void;
    debug(message: string): void;
}