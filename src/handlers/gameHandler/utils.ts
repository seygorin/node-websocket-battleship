import {WebSocket} from 'ws'
import {Game} from '../../types/database'
import {WebSocketManager} from '../../network/WebSocketManager'
import {updateGame, updatePlayerStats, getPlayers} from '../../database'
import {sendResponse} from '../../utils/sendResponse'
import {GameStatus} from '../../types/gameTypes'

export function broadcastWinners(wsManager: WebSocketManager): void {
  const winners = getPlayers().map((p) => ({
    name: p.name,
    wins: p.wins || 0,
  }))

  wsManager.getAllClients().forEach(([ws]) => {
    sendResponse(ws, 'update_winners', winners, 0)
  })
}

export function handleGameOver(
  game: Game,
  winner: number,
  wsManager: WebSocketManager
): void {
  updatePlayerStats(winner, 1)

  game.players.forEach((playerId) => {
    const playerWs = wsManager.findPlayerConnection(playerId)
    if (playerWs) {
      sendResponse(playerWs, 'finish', {winPlayer: winner}, 0)
    }
  })

  updateGame(game.idGame, {status: GameStatus.FINISHED})
  broadcastWinners(wsManager)
}

export function broadcastAttackResult(
  game: Game,
  x: number,
  y: number,
  nextPlayer: number,
  status: string,
  wsManager: WebSocketManager,
  id: number
): void {
  game.players.forEach((playerId) => {
    const playerWs = wsManager.findPlayerConnection(playerId)
    if (playerWs) {
      sendResponse(
        playerWs,
        'attack',
        {
          x,
          y,
          currentPlayer: nextPlayer,
          status,
        },
        id
      )
    }
  })
}

export function handleNextTurn(
  game: Game,
  nextPlayer: number,
  wsManager: WebSocketManager
): void {
  game.players.forEach((playerId) => {
    const playerWs = wsManager.findPlayerConnection(playerId)
    if (playerWs) {
      sendResponse(playerWs, 'turn', {currentPlayer: nextPlayer}, 0)
    }
  })
}
