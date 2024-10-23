import WebSocket from 'ws'
import {getRooms, addRoom, getPlayers} from '../database.js'
import {sendResponse} from '../utils/websocket.js'

export function handleRoomRequests(ws, type, data, id) {
  switch (type) {
    case 'create_room':
      createRoom(ws, id)
      break
    case 'add_user_to_room':
      addUserToRoom(ws, data, id)
      break
  }
}

function createRoom(ws, id) {
  const rooms = getRooms()
  const newRoom = {
    roomId: generateRoomId(),
    roomUsers: [],
  }
  addRoom(newRoom)
  updateRooms(ws)
}

function addUserToRoom(ws, data, id) {
  const {indexRoom} = data
  const rooms = getRooms()
  const room = rooms.find((r) => r.roomId === indexRoom)

  if (room && room.roomUsers.length < 2) {
    updateRooms(ws)
    if (room.roomUsers.length === 2) {
      createGame(ws, room)
    }
  } else {
    sendResponse(ws, 'error', {message: 'Room not found or full'}, id)
  }
}

function updateRooms(ws) {
  const rooms = getRooms()
  const availableRooms = rooms.filter((r) => r.roomUsers.length < 2)
  sendResponse(ws, 'update_room', availableRooms, 0)
}

function createGame(ws, room) {
  const gameId = generateGameId()
  const players = room.roomUsers.map((user) => user.index)

  players.forEach((playerId, index) => {
    sendResponse(ws, 'create_game', {idGame: gameId, idPlayer: playerId}, 0)
  })
}

function generateRoomId() {
  return Math.random().toString(36).substr(2, 9)
}

function generateGameId() {
  return Math.random().toString(36).substr(2, 9)
}
