import {generateGameId} from '../utils/gameUtils.js'
import {createSinglePlayerGame, updateGame} from '../database.js'
import {GameStatus, CellStatus} from '../types/gameTypes.js'
import {sendResponse} from '../utils/sendResponse.js'
import {logger} from '../utils/logger.js'

export function handleSinglePlay(ws, data, id, wss, wsManager) {
  try {
    const currentPlayer = wsManager.getPlayerForClient(ws)
    if (!currentPlayer) {
      sendResponse(ws, 'error', {message: 'Player not found'}, id)
      return
    }

    logger.game('Starting single player game', {
      player: currentPlayer,
    })

    const game = createSinglePlayerGame(currentPlayer.index)

    const botShips = generateBotShips()

    game.ships.push({
      player: -1,
      ships: botShips,
    })

    updateGame(game.idGame, {
      ships: game.ships,
    })

    sendResponse(
      ws,
      'create_game',
      {
        idGame: game.idGame,
        idPlayer: currentPlayer.index,
        gameType: 'single',
      },
      id
    )
  } catch (error) {
    logger.error('Single play initialization error', {
      error: error.message,
      stack: error.stack,
    })
    sendResponse(
      ws,
      'error',
      {message: 'Failed to start single player game'},
      id
    )
  }
}

function generateBotShips() {
  const ships = []
  const shipTypes = [
    {type: 'huge', length: 4, count: 1},
    {type: 'large', length: 3, count: 2},
    {type: 'medium', length: 2, count: 3},
    {type: 'small', length: 1, count: 4},
  ]

  for (const shipType of shipTypes) {
    for (let i = 0; i < shipType.count; i++) {
      let position, direction
      do {
        position = {
          x: Math.floor(Math.random() * 10),
          y: Math.floor(Math.random() * 10),
        }
        direction = Math.random() > 0.5
      } while (
        !isValidBotShipPosition(ships, position, direction, shipType.length)
      )

      ships.push({
        position,
        direction,
        length: shipType.length,
        type: shipType.type,
        hits: new Array(shipType.length).fill(false),
      })
    }
  }
  return ships
}

function isValidBotShipPosition(ships, position, direction, length) {
  if (direction) {
    if (position.x + length > 10) return false
  } else {
    if (position.y + length > 10) return false
  }

  for (let i = 0; i < length; i++) {
    const x = direction ? position.x + i : position.x
    const y = direction ? position.y : position.y + i

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkX = x + dx
        const checkY = y + dy
        if (checkX >= 0 && checkX < 10 && checkY >= 0 && checkY < 10) {
          if (
            ships.some((ship) => isPointOccupiedByShip(ship, checkX, checkY))
          ) {
            return false
          }
        }
      }
    }
  }
  return true
}

function isPointOccupiedByShip(ship, x, y) {
  for (let i = 0; i < ship.length; i++) {
    const shipX = ship.direction ? ship.position.x + i : ship.position.x
    const shipY = ship.direction ? ship.position.y : ship.position.y + i
    if (shipX === x && shipY === y) return true
  }
  return false
}
