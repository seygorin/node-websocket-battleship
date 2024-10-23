import WebSocket from 'ws'
import {getGames, getPlayers} from '../database.js'
import {sendResponse} from '../utils/websocket.js'

export function handleGameRequests(ws, type, data, id) {
  const {gameId, indexPlayer} = data
  const game = getGames().find((g) => g.idGame === gameId)

  if (!game) {
    sendResponse(ws, 'error', {message: 'Game not found'}, id)
    return
  }

  if (game.currentPlayer !== indexPlayer) {
    sendResponse(ws, 'error', {message: 'Not your turn'}, id)
    return
  }

  switch (type) {
    case 'attack':
      handleAttack(ws, game, data)
      break
    case 'randomAttack':
      handleRandomAttack(ws, game, indexPlayer)
      break
  }
}

function handleAttack(ws, game, data) {
  const {x, y, indexPlayer} = data
  const result = performAttack(game, x, y, indexPlayer)
  sendAttackResult(ws, game, result)
  checkGameEnd(ws, game)
}

function handleRandomAttack(ws, game, indexPlayer) {
  const {x, y} = getRandomCoordinates(game.board)
  const result = performAttack(game, x, y, indexPlayer)
  sendAttackResult(ws, game, result)
  checkGameEnd(ws, game)
}

function performAttack(game, x, y, indexPlayer) {
  const enemyShips = game.ships.find((s) => s.player !== indexPlayer).ships
  const hitShip = enemyShips.find((ship) => isShipHit(ship, x, y))

  if (hitShip) {
    game.board[y][x] = 2
    updateShipStatus(hitShip, x, y)
    return {x, y, status: isShipSunk(hitShip) ? 'killed' : 'shot'}
  } else {
    game.board[y][x] = 1
    game.currentPlayer = game.players.find((p) => p !== indexPlayer)
    return {x, y, status: 'miss'}
  }
}

function sendAttackResult(ws, game, result) {
  sendResponse(ws, 'attack', {...result, currentPlayer: game.currentPlayer}, 0)
  sendResponse(ws, 'turn', {currentPlayer: game.currentPlayer}, 0)
}

function checkGameEnd(ws, game) {
  const losingPlayer = game.ships.find((s) =>
    s.ships.every((ship) => ship.sunk)
  )
  if (losingPlayer) {
    const winningPlayer = game.players.find((p) => p !== losingPlayer.player)
    sendResponse(ws, 'finish', {winPlayer: winningPlayer}, 0)
    updateWinnerStats(winningPlayer)
  }
}

function updateWinnerStats(winningPlayerId) {
  const players = getPlayers()
  const winner = players.find((p) => p.index.toString() === winningPlayerId)
  if (winner) {
    winner.wins++
  }
}

function isShipHit(ship, x, y) {}

function updateShipStatus(ship, x, y) {}

function isShipSunk(ship) {}

function getRandomCoordinates(board) {}
