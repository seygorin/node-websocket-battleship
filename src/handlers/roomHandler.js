import WebSocket from 'ws'
import {getRooms, addRoom, getPlayers} from '../database.js'
import {sendResponse} from '../utils/sendResponse.js'

export function handleRoomRequests(ws, type, data, id, wss, wsClients) {
  console.log('handleRoomRequests called with:', {type, data, id})

  switch (type) {
    case 'create_room':
      createRoom(ws, id, wss, wsClients)
      break
    case 'add_user_to_room':
      addUserToRoom(ws, data, id, wss, wsClients)
      break
  }
}

function createRoom(ws, id, wss, wsClients) {
  console.log('Creating new room')
  const rooms = getRooms()

  const newRoom = {
    roomId: generateRoomId(),
    roomUsers: [],
  }
  console.log('New room created:', newRoom)

  addRoom(newRoom)
  console.log('Current rooms after creation:', getRooms())

  updateRooms(ws, wss)
}

function addUserToRoom(ws, data, id, wss, wsClients) {
  console.log('RoomHandler: Starting add user to room')
  console.log('RoomHandler: Received data:', data)
  console.log('RoomHandler: wsClients:', wsClients)
  console.log('RoomHandler: Current ws client data:', wsClients.get(ws))

  const {indexRoom} = data
  const rooms = getRooms()
  
  const room = rooms.find((r) => r.roomId === indexRoom)
  console.log('RoomHandler: Found room:', room)

  if (room && room.roomUsers.length < 2) {
    const wsClient = wsClients.get(ws)
    console.log('RoomHandler: Found ws client:', wsClient)
    
    if (!wsClient || !wsClient.currentPlayer) {
      console.log('RoomHandler: No current player found for connection')
      sendResponse(ws, 'error', {message: 'No active player found'}, id)
      return
    }

    const currentPlayer = wsClient.currentPlayer
    console.log('RoomHandler: Current player:', currentPlayer)

    const userInfo = {
      name: currentPlayer.name,
      index: currentPlayer.index
    }
    
    console.log('RoomHandler: Adding user to room:', userInfo)
    room.roomUsers.push(userInfo)
    console.log('RoomHandler: Updated room:', room)
    
    updateRooms(ws, wss)
    
    if (room.roomUsers.length === 2) {
      console.log('Room is full, creating game')
      const gameId = generateGameId()

      room.roomUsers.forEach((user) => {
        console.log('Sending create_game to user:', user)
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

      const roomIndex = rooms.findIndex((r) => r.roomId === indexRoom)
      if (roomIndex !== -1) {
        rooms.splice(roomIndex, 1)
        console.log('Room removed from available rooms')
      }

      updateRooms(ws, wss)
    }
  } else {
    console.log('RoomHandler: Room not found or full')
    sendResponse(ws, 'error', {message: 'Room not found or full'}, id)
  }
}

function updateRooms(ws, wss) {
  const rooms = getRooms()
  const availableRooms = rooms
    .filter((r) => r.roomUsers.length < 2)
    .map((room) => ({
      roomId: room.roomId,
      roomUsers: room.roomUsers.map((user) => ({
        name: user.name,
        index: user.index,
      })),
    }))
  
  console.log('Sending update_room with rooms:', availableRooms)
  sendResponse(ws, 'update_room', availableRooms, 0, wss)
}

function generateRoomId() {
  const roomId = Math.random().toString(36).substr(2, 9)
  console.log('Generated room ID:', roomId)
  return roomId
}

function generateGameId() {
  const gameId = Math.random().toString(36).substr(2, 9)
  console.log('Generated game ID:', gameId)
  return gameId
}
