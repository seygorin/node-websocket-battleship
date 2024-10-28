type LogData = Record<string, any>;

interface Logger {
  game(message: string, data?: LogData): void;
  room(message: string, data?: LogData): void;
  player(message: string, data?: LogData): void;
  ship(message: string, data?: LogData): void;
  error(message: string, error?: Error | null | LogData): void;
}

export const logger: Logger = {
  game: (message: string, data: LogData = {}): void => {
    console.log(`GameLogger: ${message}`, data);
  },
  room: (message: string, data: LogData = {}): void => {
    console.log(`RoomLogger: ${message}`, data);
  },
  player: (message: string, data: LogData = {}): void => {
    console.log(`PlayerLogger: ${message}`, data);
  },
  ship: (message: string, data: LogData = {}): void => {
    console.log(`ShipLogger: ${message}`, data);
  },
  error: (message: string, error: Error | null | LogData = null): void => {
    console.error(`Error: ${message}`, error);
  },
};
