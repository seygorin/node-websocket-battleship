import {Game} from '../../types/database'
import {WebSocketManager} from '../../network/WebSocketManager'
import {GameLogic} from '../../game/GameLogic'
import {logger} from '../../utils/logger'
import {updateGame} from '../../database'
import {sendResponse} from '../../utils/sendResponse'
import {AttackResult} from '../../types/database'
import {GameStatus} from '../../types/gameTypes'

export function makeBotMove(game: Game, wsManager: WebSocketManager): void {
  try {
    const position = GameLogic.getRandomAttackPosition(game);
    if (!position) {
      logger.game('No available positions for bot attack');
      return;
    }

    const attackResult = GameLogic.processAttack(game, position.x, position.y);
    const nextPlayer = attackResult.status === 'miss' 
      ? game.players.find((p) => p !== -1)! 
      : -1;

    updateGame(game.idGame, {
      board: game.board,
      currentPlayer: nextPlayer,
      status: GameStatus.PLAYING,
    });

    const playerWs = wsManager.findPlayerConnection(
      game.players.find((p) => p !== -1)!
    );

    if (playerWs) {
      const response: AttackResponse = {
        player: 'ourField',  // Для игрока это всегда его поле
        position: {
          x: position.x,
          y: position.y
        },
        status: attackResult.status
      };

      logger.game('Sending bot attack response', { response });
      
      // Отправляем результат атаки
      sendResponse(playerWs, 'attack', response, 0);

      // Отправляем информацию о текущем ходе
      sendResponse(playerWs, 'turn', {
        currentPlayer: nextPlayer
      }, 0);
    }

    if (nextPlayer === -1 && !attackResult.gameOver) {
      setTimeout(() => {
        makeBotMove(game, wsManager);
      }, 1000);
    }
  } catch (error) {
    const err = error as Error;
    logger.error('Bot move error', {
      error: err.message,
      stack: err.stack,
    });
  }
}
