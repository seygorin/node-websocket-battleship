import {logger} from '../utils/logger.js'

export function initializeBoard() {
  return Array(10)
    .fill(null)
    .map(() => Array(10).fill(0))
}

export function validateShips(ships) {
  return ships.map((ship) => {
    const position = {
      x: Number(ship.position.x),
      y: Number(ship.position.y),
    }

    const direction = !Boolean(ship.direction)

    logger.game('Validating ship', {
      type: ship.type,
      clientDirection: ship.direction,
      validatedDirection: direction,
      clientSays: ship.direction ? 'vertical' : 'horizontal',
      serverSays: direction ? 'horizontal' : 'vertical',
    })

    return {
      position,
      direction,
      length: Number(ship.length),
      type: ship.type,
      hits: new Array(ship.length).fill(false),
    }
  })
}

export function generateGameId() {
  return Math.random().toString(36).substr(2, 9)
}
