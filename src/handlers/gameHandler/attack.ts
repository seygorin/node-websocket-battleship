import {WebSocket, WebSocketServer} from 'ws'
import {Game} from '../../types/database'
import {WebSocketManager} from '../../network/WebSocketManager'
import {GameStatus} from '../../types/gameTypes'
import {GameLogic} from '../../game/GameLogic'
import {logger} from '../../utils/logger'
import {sendResponse} from '../../utils/sendResponse'
import {updateGame} from '../../database'
import {clearTurnTimer} from '../gameHandler'
import {
  broadcastWinners,
  handleGameOver,
  broadcastAttackResult,
  handleNextTurn,
} from './utils'

export function handleAttack(
  ws: WebSocket,
  game: Game,
  x: number,
  y: number,
  wsManager: WebSocketManager,
  id: number
): void {
  try {
    if (game.status === GameStatus.FINISHED) {
      return
    }

    clearTurnTimer(game.idGame)
    const attackResult = GameLogic.processAttack(game, x, y)

    logger.game('Attack result', {
      result: attackResult,
      currentPlayer: game.currentPlayer,
      gameOver: attackResult.gameOver,
    })

    if (attackResult.gameOver) {
      handleGameOver(game, attackResult.winner!, wsManager)
      broadcastWinners(wsManager)
      return
    }

    const nextPlayer =
      attackResult.status === 'miss'
        ? game.players.find((p) => p !== game.currentPlayer)!
        : game.currentPlayer

    updateGame(game.idGame, {
      board: game.board,
      currentPlayer: nextPlayer,
      status: GameStatus.PLAYING,
    })

    broadcastAttackResult(
      game,
      x,
      y,
      nextPlayer,
      attackResult.status,
      wsManager,
      id
    )
    handleNextTurn(game, nextPlayer, wsManager)
  } catch (error) {
    const err = error as Error
    logger.error('Attack handling error', {
      error: err.message,
      stack: err.stack,
    })
    sendResponse(ws, 'error', {message: 'Failed to process attack'}, id)
  }
}
