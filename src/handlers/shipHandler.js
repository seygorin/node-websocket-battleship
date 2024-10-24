import WebSocket from 'ws'
import {getGame, updateGame} from '../database.js'
import {sendResponse} from '../utils/sendResponse.js'
import {validateShips} from '../utils/gameUtils.js'
import {GameLogic} from '../game/GameLogic.js'

export function handleShipRequests(ws, data, id, wss, wsManager) {
  const {gameId, ships} = data
  const game = getGame(gameId)

  const currentPlayer = wsManager.getPlayerForClient(ws)
  const indexPlayer = currentPlayer?.index

  if (!game) {
    sendResponse(ws, 'error', {message: 'Game not found'}, id)
    return
  }

  if (!currentPlayer || indexPlayer === undefined) {
    sendResponse(ws, 'error', {message: 'Player not found'}, id)
    return
  }

  if (!game.players.includes(indexPlayer)) {
    sendResponse(ws, 'error', {message: 'Player not in this game'}, id)
    return
  }

  const existingShipsIndex = game.ships.findIndex(
    (s) => s.player === indexPlayer
  )

  const validatedShips = validateShips(ships)

  if (existingShipsIndex !== -1) {
    game.ships[existingShipsIndex] = {
      player: indexPlayer,
      ships: validatedShips,
    }
  } else {
    game.ships.push({
      player: indexPlayer,
      ships: validatedShips,
    })
  }

  updateGame(game.idGame, {ships: game.ships})

  const playersWithShips = game.ships.map((s) => s.player)
  const allPlayersReady = game.players.every((p) =>
    playersWithShips.includes(p)
  )

  if (allPlayersReady) {
    startGame(ws, game, wss, wsManager)
  } else {
    game.players.forEach((playerId) => {
      const playerConnection = wsManager.findPlayerConnection(playerId)
      if (playerConnection) {
        sendResponse(playerConnection, 'wait_for_opponent', {}, id)
      }
    })
  }
}

function startGame(ws, game, wss, wsManager) {
  const randomPlayer =
    game.players[Math.floor(Math.random() * game.players.length)]

  updateGame(game.idGame, {
    currentPlayer: randomPlayer,
    status: 'playing',
  })

  game.players.forEach((playerId) => {
    const playerConnection = wsManager.findPlayerConnection(playerId)
    if (playerConnection) {
      const playerShips = game.ships.find((s) => s.player === playerId)?.ships

      sendResponse(
        playerConnection,
        'start_game',
        {
          ships: playerShips,
          currentPlayerIndex: randomPlayer,
        },
        0
      )
    }
  })

  sendResponse(ws, 'turn', {currentPlayer: randomPlayer}, 0, wss)
}
