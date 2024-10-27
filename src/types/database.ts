export interface Player {
  index: number;
  name: string;
  wins: number;
  password: string;
}

export interface Room {
  roomId: string;
  roomUsers: Player[];
  created: number;
}

export interface Game {
  idGame: string;
  players: number[];
  ships: ShipSet[];
  currentPlayer: number | string;
  board: number[][];
  status: GameStatus;
  lastUpdate: number;
  type?: 'single' | 'multi';
}

export interface ShipSet {
  player: number;
  ships: Ship[];
}
