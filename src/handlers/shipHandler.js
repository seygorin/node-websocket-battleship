import {WebSocket} from 'ws'
import {getGame, updateGame} from '../database.js'
import {sendResponse} from '../utils/sendResponse.js'
import {validateShips} from '../utils/gameUtils.js'
import {GameLogic} from '../game/GameLogic.js'
import {GameStatus, CellStatus} from '../types/gameTypes.js'
import {logger} from '../utils/logger.js'
import {makeBotMove} from './gameHandler.js'

export function handleShipRequests(ws, data, id, wss, wsManager) {
  try {
    const {gameId, ships} = data

    logger.game('Raw client ship data', {
      ships: ships.map((ship) => ({
        position: ship.position,
        direction: ship.direction,
        length: ship.length,
        type: ship.type,
        clientInterpretation: ship.direction ? 'horizontal' : 'vertical',
      })),
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
      validatedShips: validatedShips.map((ship) => ({
        position: ship.position,
        direction: ship.direction,
        length: ship.length,
        type: ship.type,
      })),
    })

    game.ships.push({
      player: playerIndex,
      ships: validatedShips,
    })

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
      const firstPlayer =
        game.players[Math.floor(Math.random() * game.players.length)]

      logger.game('All players ready, starting game', {
        firstPlayer,
        players: game.players,
        shipsCount: game.ships.length,
      })

      const emptyBoard = Array(10)
        .fill(null)
        .map(() => Array(10).fill(CellStatus.EMPTY))

      const updatedGame = updateGame(game.idGame, {
        currentPlayer: firstPlayer,
        status: GameStatus.PLAYING,
        board: emptyBoard,
      })

      if (firstPlayer === -1) {
        logger.game('Bot goes first, initiating bot move', {
          firstPlayer,
          gameId: game.idGame,
        })

        setTimeout(() => {
          makeBotMove(updatedGame, wsManager)
        }, 1000)
      }

      updatedGame.players.forEach((playerId) => {
        const playerWs = wsManager.findPlayerConnection(playerId)
        if (playerWs) {
          const playerShips = game.ships.find(
            (s) => s.player === playerId
          ).ships
          sendResponse(
            playerWs,
            'start_game',
            {
              ships: playerShips,
              currentPlayerIndex: playerId,
            },
            0
          )
          logger.game('Sending ships to client', {
            playerId,
            ships: playerShips.map((ship) => ({
              position: ship.position,
              direction: ship.direction,
              length: ship.length,
              type: ship.type,
              interpretation: ship.direction ? 'horizontal' : 'vertical',
            })),
          })
        }
      })
    } else {
      logger.game('Waiting for other player ships', {
        readyPlayers: playersWithShips,
        allPlayers: game.players,
      })
      sendResponse(
        ws,
        'wait_for_opponent',
        {
          message: 'Waiting for opponent to place ships',
        },
        id
      )
    }
  } catch (error) {
    logger.error('Ship placement error', {
      error: error.message,
      stack: error.stack,
    })
    sendResponse(ws, 'error', {message: 'Failed to place ships'}, id)
  }
}
