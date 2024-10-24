export const logger = {
  game: (message, data = {}) => {
    console.log(`GameLogger: ${message}`, data)
  },
  room: (message, data = {}) => {
    console.log(`RoomLogger: ${message}`, data)
  },
  player: (message, data = {}) => {
    console.log(`PlayerLogger: ${message}`, data)
  },
  ship: (message, data = {}) => {
    console.log(`ShipLogger: ${message}`, data)
  },
  error: (message, error = null) => {
    console.error(`Error: ${message}`, error)
  },
}
