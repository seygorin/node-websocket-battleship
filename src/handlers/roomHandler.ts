import {logger} from '../utils/logger'
import {sendResponse} from '../utils/sendResponse'
import {
  createRoom,
  getRoom,
  getRooms,
  addUserToRoom,
  removeRoom,
  addGame,
} from '../database'
import {GameLogic} from '../game/GameLogic'
import {WebSocket, WebSocketServer} from 'ws'
import {WebSocketManager} from '../network/WebSocketManager'
import {Room, Player, Game} from '../types/database'

const MAX_ROOM_SIZE = 2

interface RoomRequestData {
  indexRoom: string
}

interface GameCreationData {
  idGame: string
  idPlayer: number
}

type RoomRequestType = 'create_room' | 'add_user_to_room'

export function handleRoomRequests(
  ws: WebSocket,
  type: RoomRequestType,
  data: RoomRequestData,
  id: number,
  wss: WebSocketServer,
  wsManager: WebSocketManager
): void {
  try {
    switch (type) {
      case 'create_room':
        handleCreateRoom(ws, data, id, wss, wsManager)
        break
      case 'add_user_to_room':
        handleJoinRoom(ws, data, id, wss, wsManager)
        break
    }
  } catch (error) {
    logger.error('Room handling error', error)
    sendResponse(ws, 'error', {message: 'Failed to process room request'}, id)
  }
}

function handleCreateRoom(
  ws: WebSocket,
  data: RoomRequestData,
  id: number,
  wss: WebSocketServer,
  wsManager: WebSocketManager
): void {
  try {
    const currentPlayer = wsManager.getPlayerForClient(ws)
    logger.room('Create room request', {
      currentPlayer,
      wsManagerClients: wsManager.getAllClients().length,
    })

    if (!currentPlayer || !currentPlayer.name) {
      logger.error('Invalid player data for room creation', {currentPlayer})
      sendResponse(
        ws,
        'error',
        {
          message: 'No active player found or invalid player data',
          error: true,
        },
        id
      )
      return
    }

    const room = createRoom({
      name: currentPlayer.name,
      index: currentPlayer.index,
      password: currentPlayer.password,
      wins: currentPlayer.wins,
    })

    logger.room('Room created', {room})

    const success = addUserToRoom(room.roomId, {
      name: currentPlayer.name,
      index: currentPlayer.index,
      password: currentPlayer.password,
      wins: currentPlayer.wins,
    })

    if (success) {
      logger.room('Player added to room', {
        player: currentPlayer,
        roomId: room.roomId,
      })
      updateRooms(ws, wss)
    } else {
      logger.error('Failed to add player to room', {
        player: currentPlayer,
        roomId: room.roomId,
      })
    }
  } catch (error) {
    const err = error as Error
    logger.error('Room creation error', {
      error: err.message,
      stack: err.stack,
    })
    sendResponse(ws, 'error', {message: 'Failed to create room'}, id)
  }
}

function handleJoinRoom(
  ws: WebSocket,
  data: RoomRequestData,
  id: number,
  wss: WebSocketServer,
  wsManager: WebSocketManager
): void {
  const {indexRoom} = data
  const room = getRoom(indexRoom)

  if (!validateRoomJoin(ws, room, wsManager, id)) {
    return
  }

  const currentPlayer = wsManager.getPlayerForClient(ws)
  if (!currentPlayer) {
    sendResponse(ws, 'error', {message: 'No active player found'}, id)
    return
  }

  const success = addUserToRoom(indexRoom, {
    name: currentPlayer.name,
    index: currentPlayer.index,
    password: currentPlayer.password,
    wins: currentPlayer.wins,
  })

  if (success) {
    updateRooms(ws, wss)

    const updatedRoom = getRoom(indexRoom)
    if (updatedRoom && updatedRoom.roomUsers.length === MAX_ROOM_SIZE) {
      handleGameCreation(updatedRoom, ws, wss, wsManager)
      removeRoom(indexRoom)
      updateRooms(ws, wss)
    }
  }
}

function validateRoomJoin(
  ws: WebSocket,
  room: Room | undefined,
  wsManager: WebSocketManager,
  id: number
): boolean {
  if (!room) {
    sendResponse(ws, 'error', {message: 'Room not found'}, id)
    return false
  }

  const currentPlayer = wsManager.getPlayerForClient(ws)
  if (!currentPlayer) {
    sendResponse(ws, 'error', {message: 'No active player found'}, id)
    return false
  }

  if (room.roomUsers.length >= MAX_ROOM_SIZE) {
    sendResponse(ws, 'error', {message: 'Room is full'}, id)
    return false
  }

  const isPlayerInRoom = room.roomUsers.some(
    (user) => user.index === currentPlayer.index
  )
  if (isPlayerInRoom) {
    sendResponse(ws, 'error', {message: 'You are already in this room'}, id)
    return false
  }

  return true
}

function handleGameCreation(
  room: Room,
  ws: WebSocket,
  wss: WebSocketServer,
  wsManager: WebSocketManager
): void {
  const game = addGame(room)
  notifyGameCreated(room, game.idGame, ws, wss, wsManager)
}

function notifyGameCreated(
  room: Room,
  gameId: string,
  ws: WebSocket,
  wss: WebSocketServer,
  wsManager: WebSocketManager
): void {
  room.roomUsers.forEach((user) => {
    logger.game('Sending game creation notification', {user, gameId})
    const gameData: GameCreationData = {
      idGame: gameId,
      idPlayer: user.index,
    }

    const playerWs = wsManager.findPlayerConnection(user.index)
    if (playerWs) {
      sendResponse(playerWs, 'create_game', gameData, 0)
    }
  })
}

function updateRooms(ws: WebSocket, wss: WebSocketServer): void {
  const rooms = getRooms()
  sendResponse(ws, 'update_room', rooms, 0, wss)
}
