import WebSocket from 'ws'
import {getGames, addGame} from '../database.js'
import { sendResponse } from '../utils/websocket.js'

export function handleShipRequests(ws, data, id) {
  const {gameId, ships, indexPlayer} = data
  const games = getGames()
  let game = games.find((g) => g.idGame === gameId)

  if (!game) {
    game = {
      idGame: gameId,
      players: [indexPlayer],
      ships: [{player: indexPlayer, ships}],
      currentPlayer: '',
      board: initializeBoard(),
    }
    addGame(game)
  } else {
    game.players.push(indexPlayer)
    game.ships.push({player: indexPlayer, ships})
  }

  if (game.ships.length === 2) {
    startGame(ws, game)
  } else {
    sendResponse(ws, 'wait_for_opponent', {}, id)
  }
}

function startGame(ws, game) {
  game.currentPlayer = game.players[Math.floor(Math.random() * 2)]

  game.players.forEach((playerId) => {
    const playerShips = game.ships.find((s) => s.player === playerId).ships
    sendResponse(
      ws,
      'start_game',
      {ships: playerShips, currentPlayerIndex: game.currentPlayer},
      0
    )
  })

  sendResponse(ws, 'turn', {currentPlayer: game.currentPlayer}, 0)
}

function initializeBoard() {
  return Array(10)
    .fill(null)
    .map(() => Array(10).fill(0))
}
