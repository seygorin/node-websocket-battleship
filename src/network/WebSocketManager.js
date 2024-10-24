import {logger} from '../utils/logger.js'

export class WebSocketManager {
  constructor() {
    this.clients = new Map()
  }

  addClient(ws) {
    this.clients.set(ws, {currentPlayer: null})
    logger.game('New client connected', {totalClients: this.clients.size})
  }

  removeClient(ws) {
    this.clients.delete(ws)
    logger.game('Client disconnected', {totalClients: this.clients.size})
  }

  setPlayerForClient(ws, player) {
    const client = this.clients.get(ws)
    if (client && player && player.name) {
      client.currentPlayer = {
        name: player.name,
        index: player.index,
        password: player.password,
        wins: player.wins || 0,
      }
      logger.player('Player set for client', {
        player: client.currentPlayer,
        clientsSize: this.clients.size,
      })
    } else {
      logger.error('Invalid player data in setPlayerForClient', {player})
    }
  }

  getPlayerForClient(ws) {
    const client = this.clients.get(ws)
    const player = client?.currentPlayer
    logger.player('Get player for client', {
      player,
      clientsSize: this.clients.size,
      hasClient: !!client,
      hasPlayer: !!player,
    })
    return player
  }

  findPlayerConnection(playerId) {
    return Array.from(this.clients.entries()).find(
      ([_, client]) => client.currentPlayer?.index === playerId
    )?.[0]
  }

  getAllClients() {
    return this.clients
  }
}
