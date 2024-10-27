import {logger} from '../utils/logger.js'

export function initializeBoard() {
  return Array(10)
    .fill(null)
    .map(() => Array(10).fill(0))
}

export function validateShips(ships) {
  return ships.map((ship) => {
    const position = {
      x: Math.min(Math.max(Number(ship.position.x), 0), 9),
      y: Math.min(Math.max(Number(ship.position.y), 0), 9),
    }

    const direction = !Boolean(ship.direction)
    const length = Number(ship.length)

    if (!direction) {
      if (position.x + length > 10) {
        position.x = 10 - length
      }
    } else {
      if (position.y + length > 10) {
        position.y = 10 - length
      }
    }

    logger.game('Validating ship', {
      type: ship.type,
      position,
      direction,
      length,
      interpretation: !direction ? 'horizontal' : 'vertical',
    })

    return {
      position,
      direction,
      length,
      type: ship.type,
      hits: new Array(length).fill(false),
    }
  })
}

export function generateGameId() {
  return Math.random().toString(36).substr(2, 9)
}
