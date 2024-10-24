import {WebSocket} from 'ws'
import {getGame, updateGame, updatePlayerStats} from '../database.js'
import {sendResponse} from '../utils/sendResponse.js'
import {logger} from '../utils/logger.js'
import {GameStatus} from '../types/gameTypes.js'
import {GameLogic} from '../game/GameLogic.js'

export function handleGameRequests(ws, type, data, id, wss, wsManager) {
  const {gameId, x, y} = data
  const game = getGame(gameId)

  if (!validateGameAction(ws, game, wsManager, id)) {
    return
  }

  switch (type) {
    case 'attack':
      handleAttack(ws, game, x, y, wsManager)
      break
    case 'randomAttack':
      handleRandomAttack(ws, game, wsManager)
      break
    default:
      logger.error('Unknown game action', {type})
      sendResponse(ws, 'error', {message: 'Unknown game action'}, id)
  }
}

function validateGameAction(ws, game, wsManager, id) {
  if (!game) {
    sendResponse(ws, 'error', {message: 'Game not found'}, id)
    return false
  }

  const currentPlayer = wsManager.getPlayerForClient(ws)
  if (!currentPlayer || currentPlayer.index !== game.currentPlayer) {
    sendResponse(ws, 'error', {message: 'Not your turn'}, id)
    return false
  }

  if (game.status !== GameStatus.PLAYING) {
    sendResponse(ws, 'error', {message: 'Game is not in playing state'}, id)
    return false
  }

  return true
}

function handleAttack(ws, game, x, y, wsManager) {
  const attackResult = GameLogic.processAttack(game, x, y)

  game = updateGame(game.idGame, {
    board: game.board,
    currentPlayer: GameLogic.getNextPlayer(game),
    status: attackResult.gameOver ? GameStatus.FINISHED : GameStatus.PLAYING,
  })

  broadcastGameState(game, attackResult, wsManager)
}

function broadcastGameState(game, attackResult, wsManager) {
  game.players.forEach((playerId) => {
    const playerWs = wsManager.findPlayerConnection(playerId)
    if (playerWs) {
      const playerView = GameLogic.getPlayerGameView(game, playerId)
      sendResponse(
        playerWs,
        'gameState',
        {
          ...playerView,
          attackResult,
          currentPlayer: game.currentPlayer,
        },
        0
      )
    }
  })
}

function updateWinnerStats(winningPlayerId) {}

function isShipHit(ship, x, y) {}

function updateShipStatus(ship, x, y) {}

function isShipSunk(ship) {}
