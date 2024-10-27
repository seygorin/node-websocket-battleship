import {logger} from './utils/logger.js'
import {GameStatus} from './types/gameTypes.js'
import {initializeBoard} from './utils/gameUtils.js'
import {generateGameId} from './utils/gameUtils.js'

class GameDatabase {
  constructor() {
    this.players = new Map()
    this.rooms = new Map()
    this.games = new Map()
  }

  // Players
  getPlayers() {
    return Array.from(this.players.values())
  }

  addPlayer(player) {
    this.players.set(player.index, player)
    logger.player('Player added', {name: player.name, index: player.index})
  }

  getPlayer(index) {
    return this.players.get(index)
  }

  updatePlayerStats(playerId, wins) {
    const player = this.players.get(playerId)
    if (player) {
      player.wins = (player.wins || 0) + wins
      this.players.set(playerId, player)
      logger.player('Player stats updated', {
        playerId,
        newWins: player.wins,
      })
      return true
    }
    return false
  }

  // Rooms
  createRoom(creator) {
    const roomId = Math.random().toString(36).substr(2, 9)
    const room = {
      roomId,
      roomUsers: [],
      created: Date.now(),
    }
    this.rooms.set(roomId, room)
    logger.room('Room created', {roomId, creator})
    return room
  }

  getRoom(roomId) {
    return this.rooms.get(roomId)
  }

  getRooms() {
    return Array.from(this.rooms.values())
  }

  addUserToRoom(roomId, user) {
    const room = this.rooms.get(roomId)
    if (room && room.roomUsers.length < 2) {
      if (!room.roomUsers.some((u) => u.index === user.index)) {
        room.roomUsers.push(user)
        logger.room('User added to room', {roomId, user})
        return true
      }
    }
    return false
  }

  removeRoom(roomId) {
    const removed = this.rooms.delete(roomId)
    if (removed) {
      logger.room('Room removed', {roomId})
    }
    return removed
  }

  // Games
  createGame(room) {
    const gameId = Math.random().toString(36).substr(2, 9)
    const game = {
      idGame: gameId,
      players: room.roomUsers.map((user) => user.index),
      ships: [],
      currentPlayer: '',
      board: initializeBoard(),
      status: 'waiting',
      lastUpdate: Date.now(),
    }
    this.games.set(gameId, game)
    logger.game('Game created', {gameId, players: game.players})
    return game
  }

  getGame(gameId) {
    return this.games.get(gameId)
  }

  getGames() {
    return Array.from(this.games.values())
  }

  updateGame(gameId, updateData) {
    const game = this.games.get(gameId)
    if (game) {
      const updatedGame = {
        ...game,
        ...updateData,
        lastUpdate: Date.now(),
      }
      this.games.set(gameId, updatedGame)
      logger.game('Game updated', {gameId, updates: Object.keys(updateData)})
      return updatedGame
    }
    return null
  }

  // Utility methods

  cleanup() {
    const now = Date.now()
    const TIMEOUT = 30 * 60 * 1000 // 30 minutes

    for (const [gameId, game] of this.games) {
      if (now - game.lastUpdate > TIMEOUT) {
        this.games.delete(gameId)
        logger.game('Inactive game removed', {gameId})
      }
    }

    for (const [roomId, room] of this.rooms) {
      if (now - room.created > TIMEOUT) {
        this.rooms.delete(roomId)
        logger.room('Inactive room removed', {roomId})
      }
    }
  }

  clear() {
    this.players.clear()
    this.rooms.clear()
    this.games.clear()
    logger.game('Database cleared')
  }

  createSinglePlayerGame(playerIndex) {
    const gameId = generateGameId()
    const game = {
      idGame: gameId,
      players: [playerIndex, -1], // -1 для бота
      ships: [],
      currentPlayer: playerIndex,
      board: initializeBoard(),
      status: GameStatus.WAITING,
      lastUpdate: Date.now(),
      type: 'single'
    }
    
    this.games.set(gameId, game)
    logger.game('Single player game created', {
      gameId, 
      player: playerIndex,
      bot: -1
    })
    
    return game
  }
}

export const db = new GameDatabase()

export const getPlayers = () => db.getPlayers()
export const addPlayer = (player) => db.addPlayer(player)
export const getRooms = () => db.getRooms()
export const getGames = () => db.getGames()
export const addGame = (game) => db.createGame(game)
export const cleanup = () => db.cleanup()
export const getGame = (gameId) => db.getGame(gameId)
export const updateGame = (gameId, data) => db.updateGame(gameId, data)
export const getRoom = (roomId) => db.getRoom(roomId)
export const createRoom = (creator) => db.createRoom(creator)
export const addUserToRoom = (roomId, user) => db.addUserToRoom(roomId, user)
export const removeRoom = (roomId) => db.removeRoom(roomId)
export const updatePlayerStats = (playerId, wins) =>
  db.updatePlayerStats(playerId, wins)

export function createSinglePlayerGame(playerIndex) {
  return db.createSinglePlayerGame(playerIndex)
}
