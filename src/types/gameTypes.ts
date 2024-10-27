export const GameStatus = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished',
} as const;

export const ShipTypes = {
  HUGE: 'huge',
  LARGE: 'large',
  MEDIUM: 'medium',
  SMALL: 'small',
} as const;

export const CellStatus = {
  EMPTY: 0,
  SHIP: 1,
  MISS: 2,
  HIT: 3,
} as const;

export type GameStatus = typeof GameStatus[keyof typeof GameStatus];
export type ShipType = typeof ShipTypes[keyof typeof ShipTypes];
export type CellStatus = typeof CellStatus[keyof typeof CellStatus];
