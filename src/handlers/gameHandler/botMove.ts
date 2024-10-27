import {Game} from '../../types/database'
import {WebSocketManager} from '../../network/WebSocketManager'
import {GameLogic} from '../../game/GameLogic'
import {logger} from '../../utils/logger'

export function makeBotMove(game: Game, wsManager: WebSocketManager): void {
  try {
    const position = GameLogic.getRandomAttackPosition(game);
    if (!position) {
      logger.game('No available positions for bot attack');
      return;
    }

    logger.game('Bot making move', {
      position,
      gameId: game.idGame,
    });

    const attackResult = GameLogic.processAttack(game, position.x, position.y);
    const nextPlayer = attackResult.status === 'miss' 
      ? game.players.find((p) => p !== -1)! 
      : -1;

    updateGame(game.idGame, {
      board: game.board,
      currentPlayer: nextPlayer,
      status: GameStatus.PLAYING,
    });

    broadcastBotMove(game, position, nextPlayer, attackResult.status, wsManager);
    handleNextTurn(game, nextPlayer, wsManager);
  } catch (error) {
    const err = error as Error;
    logger.error('Bot move error', {
      error: err.message,
      stack: err.stack,
    });
  }
}
