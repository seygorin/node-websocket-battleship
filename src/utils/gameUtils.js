export function initializeBoard() {
  return Array(10)
    .fill(null)
    .map(() => Array(10).fill(0))
}

export function validateShips(ships) {
  return ships.map((ship) => ({
    position: {
      x: Number(ship.position.x),
      y: Number(ship.position.y),
    },
    direction: Boolean(ship.direction),
    length: Number(ship.length),
    type: ship.type,
    hits: new Array(ship.length).fill(false),
  }))
}

export function generateGameId() {
  return Math.random().toString(36).substr(2, 9)
}
