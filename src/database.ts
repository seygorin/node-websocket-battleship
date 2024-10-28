import {logger} from './utils/logger'
import {GameStatus} from './types/gameTypes'
import {initializeBoard, generateGameId} from './utils/gameUtils'
import {Player, Room, Game} from './types/database'

class GameDatabase {
  private players: Map<number, Player>
  private rooms: Map<string, Room>
  private games: Map<string, Game>

  constructor() {
    this.players = new Map()
    this.rooms = new Map()
    this.games = new Map()
  }

  // Players
  getPlayers(): Player[] {
    return Array.from(this.players.values())
  }

  addPlayer(player: Player): void {
    this.players.set(player.index, player)
    logger.player('Player added', {name: player.name, index: player.index})
  }

  getPlayer(index: number): Player | undefined {
    return this.players.get(index)
  }

  updatePlayerStats(playerId: number, wins: number): boolean {
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
  createRoom(creator: Player): Room {
    const roomId = Math.random().toString(36).substr(2, 9)
    const room: Room = {
      roomId,
      roomUsers: [],
      created: Date.now(),
    }
    this.rooms.set(roomId, room)
    logger.room('Room created', {roomId, creator})
    return room
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  getRooms(): Room[] {
    return Array.from(this.rooms.values())
  }

  addUserToRoom(roomId: string, user: Player): boolean {
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

  removeRoom(roomId: string): boolean {
    const removed = this.rooms.delete(roomId)
    if (removed) {
      logger.room('Room removed', {roomId})
    }
    return removed
  }

  // Games
  createGame(room: Room): Game {
    const gameId = Math.random().toString(36).substr(2, 9)
    const game: Game = {
      idGame: gameId,
      players: room.roomUsers.map((user) => user.index),
      ships: [],
      currentPlayer: '',
      board: initializeBoard(),
      status: GameStatus.WAITING,
      lastUpdate: Date.now(),
      type: 'multi',
    }
    this.games.set(gameId, game)
    logger.game('Game created', {gameId, players: game.players})
    return game
  }

  getGame(gameId: string): Game | undefined {
    return this.games.get(gameId)
  }

  getGames(): Game[] {
    return Array.from(this.games.values())
  }

  updateGame(gameId: string, updateData: Partial<Game>): Game | null {
    const game = this.games.get(gameId)
    if (game) {
      const updatedGame: Game = {
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

  cleanup(): void {
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

  clear(): void {
    this.players.clear()
    this.rooms.clear()
    this.games.clear()
    logger.game('Database cleared')
  }

  createSinglePlayerGame(playerIndex: number): Game {
    const gameId = generateGameId()
    const game: Game = {
      idGame: gameId,
      players: [playerIndex, -1], // -1 fot bot
      ships: [],
      currentPlayer: playerIndex,
      board: initializeBoard(),
      status: GameStatus.WAITING,
      lastUpdate: Date.now(),
      type: 'single',
    }

    this.games.set(gameId, game)
    logger.game('Single player game created', {
      gameId,
      player: playerIndex,
      bot: -1,
    })

    return game
  }
}

export const db = new GameDatabase()

export const getPlayers = (): Player[] => db.getPlayers()
export const addPlayer = (player: Player): void => db.addPlayer(player)
export const getRooms = (): Room[] => db.getRooms()
export const getGames = (): Game[] => db.getGames()
export const addGame = (game: Room): Game => db.createGame(game)
export const cleanup = (): void => db.cleanup()
export const getGame = (gameId: string): Game | undefined => db.getGame(gameId)
export const updateGame = (gameId: string, data: Partial<Game>): Game | null =>
  db.updateGame(gameId, data)
export const getRoom = (roomId: string): Room | undefined => db.getRoom(roomId)
export const createRoom = (creator: Player): Room => db.createRoom(creator)
export const addUserToRoom = (roomId: string, user: Player): boolean =>
  db.addUserToRoom(roomId, user)
export const removeRoom = (roomId: string): boolean => db.removeRoom(roomId)
export const updatePlayerStats = (playerId: number, wins: number): boolean =>
  db.updatePlayerStats(playerId, wins)
export const createSinglePlayerGame = (playerIndex: number): Game =>
  db.createSinglePlayerGame(playerIndex)
