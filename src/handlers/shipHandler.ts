import {WebSocket, WebSocketServer} from 'ws'
import {getGame, updateGame} from '../database'
import {sendResponse} from '../utils/sendResponse'
import {validateShips} from '../utils/gameUtils'
import {GameLogic} from '../game/GameLogic'
import {GameStatus, CellStatus} from '../types/gameTypes'
import {logger} from '../utils/logger'
import {makeBotMove} from './gameHandler/botMove'
import {WebSocketManager} from '../network/WebSocketManager'
import {Game, Ship, ShipSet} from '../types/database'

interface ShipRequestData {
  gameId: string
  ships: Ship[]
}

interface StartGameResponse {
  ships: Ship[]
  currentPlayerIndex: number
}

interface WaitResponse {
  message: string
}

interface ShipLogData {
  position: {x: number; y: number}
  direction: boolean
  length: number
  type: string
  clientInterpretation?: string
  interpretation?: string
}

export function handleShipRequests(
  ws: WebSocket,
  data: ShipRequestData,
  id: number,
  wss: WebSocketServer,
  wsManager: WebSocketManager
): void {
  try {
    const {gameId, ships} = data

    logger.game('Raw client ship data', {
      ships: ships.map(
        (ship): ShipLogData => ({
          position: ship.position,
          direction: ship.direction,
          length: ship.length,
          type: ship.type,
          clientInterpretation: ship.direction ? 'horizontal' : 'vertical',
        })
      ),
    })

    const game = getGame(gameId)
    const currentPlayer = wsManager.getPlayerForClient(ws)

    logger.game('Processing ship request', {
      gameId,
      currentPlayer: currentPlayer?.index,
      existingShips: game?.ships,
      gamePlayers: game?.players,
      incomingShips: ships,
    })

    if (!game) {
      logger.error('Game not found', {gameId})
      sendResponse(ws, 'error', {message: 'Game not found'}, id)
      return
    }

    if (!currentPlayer) {
      logger.error('No current player found')
      sendResponse(ws, 'error', {message: 'Player not found'}, id)
      return
    }

    const playerIndex = currentPlayer.index

    if (!game.players.includes(playerIndex)) {
      logger.error('Player not in game', {
        player: playerIndex,
        gamePlayers: game.players,
      })
      sendResponse(ws, 'error', {message: 'Player not in this game'}, id)
      return
    }

    const existingShipsIndex = game.ships.findIndex(
      (s) => s.player === playerIndex
    )
    if (existingShipsIndex !== -1) {
      logger.game('Ships already exist for player', {playerIndex})
      sendResponse(ws, 'error', {message: 'Ships already placed'}, id)
      return
    }

    const validatedShips = validateShips(ships)
    logger.game('Ships after validation', {
      validatedShips: validatedShips.map(
        (ship): ShipLogData => ({
          position: ship.position,
          direction: ship.direction,
          length: ship.length,
          type: ship.type,
        })
      ),
    })

    const newShipSet: ShipSet = {
      player: playerIndex,
      ships: validatedShips,
    }

    game.ships.push(newShipSet)

    logger.game('Ships added for player', {
      player: playerIndex,
      shipsCount: validatedShips.length,
      totalShips: game.ships.length,
    })

    updateGame(game.idGame, {ships: game.ships})

    const playersWithShips = game.ships.map((s) => s.player)
    const allPlayersReady = game.players.every((p) =>
      playersWithShips.includes(p)
    )

    if (allPlayersReady) {
      handleAllPlayersReady(game, ws, wsManager)
    } else {
      logger.game('Waiting for other player ships', {
        readyPlayers: playersWithShips,
        allPlayers: game.players,
      })
      const waitResponse: WaitResponse = {
        message: 'Waiting for opponent to place ships',
      }
      sendResponse(ws, 'wait_for_opponent', waitResponse, id)
    }
  } catch (error) {
    const err = error as Error
    logger.error('Ship placement error', {
      error: err.message,
      stack: err.stack,
    })
    sendResponse(ws, 'error', {message: 'Failed to place ships'}, id)
  }
}

function handleAllPlayersReady(
  game: Game,
  ws: WebSocket,
  wsManager: WebSocketManager
): void {
  const firstPlayer =
    game.players[Math.floor(Math.random() * game.players.length)]

  logger.game('All players ready, starting game', {
    firstPlayer,
    players: game.players,
    shipsCount: game.ships.length,
  })

  const emptyBoard: number[][] = Array(10)
    .fill(null)
    .map(() => Array(10).fill(CellStatus.EMPTY))

  const updatedGame = updateGame(game.idGame, {
    currentPlayer: firstPlayer,
    status: GameStatus.PLAYING,
    board: emptyBoard,
  })

  if (updatedGame && firstPlayer === -1) {
    logger.game('Bot goes first, initiating bot move', {
      firstPlayer,
      gameId: game.idGame,
    })

    setTimeout(() => {
      makeBotMove(updatedGame, wsManager)
    }, 1000)
  }

  if (updatedGame) {
    updatedGame.players.forEach((playerId) => {
      const playerWs = wsManager.findPlayerConnection(playerId)
      const playerShipSet = game.ships.find((s) => s.player === playerId)

      if (playerWs && playerShipSet) {
        const response: StartGameResponse = {
          ships: playerShipSet.ships,
          currentPlayerIndex: playerId,
        }

        sendResponse(playerWs, 'start_game', response, 0)

        logger.game('Sending ships to client', {
          playerId,
          ships: playerShipSet.ships.map(
            (ship): ShipLogData => ({
              position: ship.position,
              direction: ship.direction,
              length: ship.length,
              type: ship.type,
              interpretation: ship.direction ? 'horizontal' : 'vertical',
            })
          ),
        })
      }
    })
  }
}
