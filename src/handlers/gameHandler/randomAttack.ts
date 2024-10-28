import { WebSocket } from 'ws';
import { Game } from '../../types/database';
import { WebSocketManager } from '../../network/WebSocketManager';
import { GameLogic } from '../../game/GameLogic';
import { logger } from '../../utils/logger';
import { sendResponse } from '../../utils/sendResponse';
import { handleAttack } from './attack';

export function handleRandomAttack(
  ws: WebSocket,
  game: Game,
  wsManager: WebSocketManager,
  id: number
): void {
  try {
    const position = GameLogic.getRandomAttackPosition(game);

    if (!position) {
      logger.game('No available positions for random attack');
      return;
    }

    logger.game('Processing random attack', {
      position,
      currentPlayer: game.currentPlayer,
      gameId: game.idGame,
    });

    handleAttack(ws, game, position.x, position.y, wsManager, id);
  } catch (error) {
    const err = error as Error;
    logger.error('Random attack error', {
      error: err.message,
      stack: err.stack,
    });
    sendResponse(ws, 'error', { message: 'Failed to process random attack' }, id);
  }
}

