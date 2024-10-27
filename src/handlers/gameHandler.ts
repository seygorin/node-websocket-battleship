import {WebSocket, WebSocketServer} from 'ws'
import {getGame, updateGame, updatePlayerStats, getPlayers} from '../database'
import {sendResponse} from '../utils/sendResponse'
import {logger} from '../utils/logger'
import {GameStatus} from '../types/gameTypes'
import {GameLogic} from '../game/GameLogic'
import {WebSocketManager} from '../network/WebSocketManager'
import {Game, Position, AttackResult} from '../types/database'
import {makeBotMove} from './gameHandler/botMove'
import {handleAttack} from './gameHandler/attack'
import {handleRandomAttack} from './gameHandler/randomAttack'

interface GameRequestData {
  gameId: string
  x: number
  y: number
  indexPlayer?: number
}

interface AttackResponse {
  position: Position
  currentPlayer: number
  status: string
}

interface TurnResponse {
  currentPlayer: number
}

interface FinishResponse {
  winPlayer: number
  isCurrentPlayerWinner?: boolean
}

interface WinnerData {
  name: string
  wins: number
}

type GameRequestType = 'attack' | 'randomAttack'

let turnTimers: Map<string, NodeJS.Timeout> = new Map()

export function handleGameRequests(
  ws: WebSocket,
  type: GameRequestType,
  data: GameRequestData,
  id: number,
  wss: WebSocketServer,
  wsManager: WebSocketManager
): void {
  try {
    const {gameId, x, y} = data
    const game = getGame(gameId)
    const currentPlayer = wsManager.getPlayerForClient(ws)

    logger.game('Game request received', {
      type,
      gameId,
      x,
      y,
      requestedPlayer: data.indexPlayer,
      wsPlayer: currentPlayer?.index,
      gameCurrent: game?.currentPlayer,
      gameStatus: game?.status,
    })

    if (!game) {
      logger.error('Game not found', {gameId})
      sendResponse(ws, 'error', {message: 'Game not found'}, id)
      return
    }

    if (!currentPlayer) {
      logger.error('Player not found for WebSocket connection')
      sendResponse(ws, 'error', {message: 'Player not found'}, id)
      return
    }

    if (
      game.currentPlayer !== currentPlayer.index &&
      game.currentPlayer !== -1
    ) {
      logger.error('Not your turn', {
        currentPlayer: game.currentPlayer,
        playerIndex: currentPlayer.index,
      })
      sendResponse(ws, 'error', {message: 'Not your turn'}, id)
      return
    }

    switch (type) {
      case 'attack':
        handleAttack(ws, game, x, y, wsManager, id)
        break
      case 'randomAttack':
        handleRandomAttack(ws, game, wsManager, id)
        break
      default:
        logger.error('Unknown game request type', {type})
        sendResponse(ws, 'error', {message: 'Unknown game request type'}, id)
    }
  } catch (error) {
    const err = error as Error
    logger.error('Game handling error', {
      error: err.message,
      stack: err.stack,
    })
    sendResponse(ws, 'error', {message: 'Failed to process game request'}, id)
  }
}

function validateGameState(
  ws: WebSocket,
  game: Game | undefined,
  playerIndex: number | undefined,
  id: number
): boolean {
  if (!game) {
    logger.error('Game not found')
    sendResponse(ws, 'error', {message: 'Game not found'}, id)
    return false
  }

  if (!playerIndex) {
    logger.error('Player not found')
    sendResponse(ws, 'error', {message: 'Player not found'}, id)
    return false
  }

  if (game.currentPlayer !== playerIndex) {
    logger.error('Not your turn', {
      currentPlayer: game.currentPlayer,
      playerIndex,
    })
    sendResponse(ws, 'error', {message: 'Not your turn'}, id)
    return false
  }

  return true
}

function handleRandomAttack(
  ws: WebSocket,
  game: Game,
  wsManager: WebSocketManager,
  id: number
): void {
  try {
    const position = GameLogic.getRandomAttackPosition(game)

    if (!position) {
      logger.game('No available positions for random attack')
      return
    }

    logger.game('Processing random attack', {
      position,
      currentPlayer: game.currentPlayer,
      gameId: game.idGame,
    })

    handleAttack(ws, game, position.x, position.y, wsManager, id)
  } catch (error) {
    const err = error as Error
    logger.error('Random attack error', {
      error: err.message,
      stack: err.stack,
    })
    sendResponse(ws, 'error', {message: 'Failed to process random attack'}, id)
  }
}

function setTurnTimer(game: Game, wsManager: WebSocketManager): void {
  if (!game.players.includes(game.currentPlayer)) {
    return
  }

  clearTurnTimer(game.idGame)

  const timer = setTimeout(() => {
    const currentPlayerWs = wsManager.findPlayerConnection(game.currentPlayer)
    if (currentPlayerWs) {
      logger.game('Turn timeout, executing random attack', {
        gameId: game.idGame,
        currentPlayer: game.currentPlayer,
      })

      handleRandomAttack(currentPlayerWs, game, wsManager, 0)
    }
  }, 15000)

  turnTimers.set(game.idGame, timer)
}

export function clearTurnTimer(gameId: string): void {
  const timer = turnTimers.get(gameId)
  if (timer) {
    clearTimeout(timer)
    turnTimers.delete(gameId)
  }
}
