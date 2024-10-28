import {logger} from './logger'
import {Ship, Position, ShipType} from '../types'

export function initializeBoard() {
  return Array(10)
    .fill(null)
    .map(() => Array(10).fill(0))
}

interface ShipToValidate {
  position: Position
  direction: boolean
  length: number
  type: ShipType
}

export function validateShips(ships: ShipToValidate[]): Ship[] {
  return ships.map((ship) => {
    const position: Position = {
      x: Math.min(Math.max(Number(ship.position.x), 0), 9),
      y: Math.min(Math.max(Number(ship.position.y), 0), 9),
    }

    const direction: boolean = !Boolean(ship.direction)
    const length: number = Number(ship.length)

    if (direction) {
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
      interpretation: direction ? 'horizontal' : 'vertical',
    })

    logger.game('Ship placement details', {
      original: {
        position: ship.position,
        direction: ship.direction,
        length: ship.length,
        type: ship.type,
      },
      validated: {
        position,
        direction,
        length,
        interpretation: direction ? 'horizontal' : 'vertical',
      },
      adjustments: {
        positionChanged:
          JSON.stringify(ship.position) !== JSON.stringify(position),
        directionChanged: ship.direction !== direction,
      },
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

function isPointOccupiedByShip(ship, x, y) {
  const shipX = ship.position.x
  const shipY = ship.position.y

  if (ship.direction) {
    return y === shipY && x >= shipX && x < shipX + ship.length
  } else {
    return x === shipX && y >= shipY && y < shipY + ship.length
  }
}
