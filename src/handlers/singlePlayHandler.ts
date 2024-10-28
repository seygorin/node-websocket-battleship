import { WebSocket, WebSocketServer } from 'ws';
import { generateGameId } from '../utils/gameUtils';
import { createSinglePlayerGame, updateGame } from '../database';
import { GameStatus, CellStatus, ShipType } from '../types/gameTypes';
import { sendResponse } from '../utils/sendResponse';
import { logger } from '../utils/logger';
import { WebSocketManager } from '../network/WebSocketManager';
import { Ship, Position } from '../types/database';

interface ShipTypeConfig {
  type: ShipType;
  length: number;
  count: number;
}

interface SinglePlayResponse {
  idGame: string;
  idPlayer: number;
  gameType: 'single';
}

export function handleSinglePlay(
  ws: WebSocket,
  data: any,
  id: number,
  wss: WebSocketServer,
  wsManager: WebSocketManager
): void {
  try {
    const currentPlayer = wsManager.getPlayerForClient(ws);
    if (!currentPlayer) {
      sendResponse(ws, 'error', { message: 'Player not found' }, id);
      return;
    }

    logger.game('Starting single player game', {
      player: currentPlayer,
    });

    const game = createSinglePlayerGame(currentPlayer.index);
    const botShips = generateBotShips();

    game.ships.push({
      player: -1,
      ships: botShips,
    });

    updateGame(game.idGame, {
      ships: game.ships,
    });

    const response: SinglePlayResponse = {
      idGame: game.idGame,
      idPlayer: currentPlayer.index,
      gameType: 'single',
    };

    sendResponse(ws, 'create_game', response, id);
  } catch (error) {
    const err = error as Error;
    logger.error('Single play initialization error', {
      error: err.message,
      stack: err.stack,
    });
    sendResponse(
      ws,
      'error',
      { message: 'Failed to start single player game' },
      id
    );
  }
}

function generateBotShips(): Ship[] {
  const ships: Ship[] = [];
  const shipTypes: ShipTypeConfig[] = [
    { type: 'huge', length: 4, count: 1 },
    { type: 'large', length: 3, count: 2 },
    { type: 'medium', length: 2, count: 3 },
    { type: 'small', length: 1, count: 4 },
  ];

  for (const shipType of shipTypes) {
    for (let i = 0; i < shipType.count; i++) {
      let position: Position, direction: boolean;
      do {
        position = {
          x: Math.floor(Math.random() * 10),
          y: Math.floor(Math.random() * 10),
        };
        direction = Math.random() > 0.5;
      } while (
        !isValidBotShipPosition(ships, position, direction, shipType.length)
      );

      ships.push({
        position,
        direction,
        length: shipType.length,
        type: shipType.type,
        hits: new Array(shipType.length).fill(false),
      });
    }
  }
  return ships;
}

function isValidBotShipPosition(
  ships: Ship[],
  position: Position,
  direction: boolean,
  length: number
): boolean {
  if (direction) {
    if (position.x + length > 10) return false;
  } else {
    if (position.y + length > 10) return false;
  }

  for (let i = 0; i < length; i++) {
    const x = direction ? position.x + i : position.x;
    const y = direction ? position.y : position.y + i;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkX = x + dx;
        const checkY = y + dy;
        if (checkX >= 0 && checkX < 10 && checkY >= 0 && checkY < 10) {
          if (
            ships.some((ship) => isPointOccupiedByShip(ship, checkX, checkY))
          ) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

function isPointOccupiedByShip(ship: Ship, x: number, y: number): boolean {
  for (let i = 0; i < ship.length; i++) {
    const shipX = ship.direction ? ship.position.x + i : ship.position.x;
    const shipY = ship.direction ? ship.position.y : ship.position.y + i;
    if (shipX === x && shipY === y) return true;
  }
  return false;
}
