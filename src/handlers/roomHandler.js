import {logger} from '../utils/logger.js'
import {sendResponse} from '../utils/sendResponse.js'
import {
  createRoom,
  getRoom,
  getRooms,
  addUserToRoom,
  removeRoom,
  addGame,
} from '../database.js'
import {GameLogic} from '../game/GameLogic.js'

const MAX_ROOM_SIZE = 2

export function handleRoomRequests(ws, type, data, id, wss, wsManager) {
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

function handleCreateRoom(ws, data, id, wss, wsManager) {
  try {
    const currentPlayer = wsManager.getPlayerForClient(ws)
    logger.room('Create room request', {
      currentPlayer,
      wsManagerClients: wsManager.clients.size,
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
    })

    logger.room('Room created', {room})

    const success = addUserToRoom(room.roomId, {
      name: currentPlayer.name,
      index: currentPlayer.index,
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
    logger.error('Room creation error', {
      error: error.message,
      stack: error.stack,
    })
    sendResponse(ws, 'error', {message: 'Failed to create room'}, id)
  }
}

function handleJoinRoom(ws, data, id, wss, wsManager) {
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
  })

  if (success) {
    updateRooms(ws, wss)

    const updatedRoom = getRoom(indexRoom)
    if (updatedRoom.roomUsers.length === 2) {
      handleGameCreation(updatedRoom, ws, wss, wsManager)
      removeRoom(indexRoom)
      updateRooms(ws, wss)
    }
  }
}

function validateRoomJoin(ws, room, wsManager, id) {
  if (!room) {
    sendResponse(ws, 'error', {message: 'Room not found'}, id)
    return false
  }

  const currentPlayer = wsManager.getPlayerForClient(ws)
  if (!currentPlayer) {
    sendResponse(ws, 'error', {message: 'No active player found'}, id)
    return false
  }

  if (room.roomUsers.length >= 2) {
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

function handleGameCreation(room, ws, wss, wsManager) {
  const game = addGame(room)
  notifyGameCreated(room, game.idGame, ws, wss)
}

function notifyGameCreated(room, gameId, ws, wss) {
  room.roomUsers.forEach((user) => {
    logger.game('Sending game creation notification', {user, gameId})
    sendResponse(
      ws,
      'create_game',
      {
        idGame: gameId,
        idPlayer: user.index,
      },
      0,
      wss
    )
  })
}

function updateRooms(ws, wss) {
  const rooms = getRooms()
  sendResponse(ws, 'update_room', rooms, 0, wss)
}
