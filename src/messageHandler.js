import WebSocket from 'ws'
import {handlePlayerRequests} from './handlers/playerHandler.js'
import {handleRoomRequests} from './handlers/roomHandler.js'
import {handleShipRequests} from './handlers/shipHandler.js'
import {handleGameRequests} from './handlers/gameHandler.js'
import {sendResponse} from './utils/websocket.js'

export function handleMessage(ws, message) {
  try {
    console.log('Received raw message:', message.toString())
    const parsedMessage = JSON.parse(message.toString())

    if (typeof parsedMessage.data === 'string') {
      parsedMessage.data = JSON.parse(parsedMessage.data)
    }

    console.log('Fully parsed message:', parsedMessage)

    const {type, data, id} = parsedMessage

    switch (type) {
      case 'reg':
        handlePlayerRequests(ws, data, id)
        break
      case 'create_room':
      case 'add_user_to_room':
        handleRoomRequests(ws, type, data, id)
        break
      case 'add_ships':
        handleShipRequests(ws, data, id)
        break
      case 'attack':
      case 'randomAttack':
        handleGameRequests(ws, type, data, id)
        break
      default:
        console.error('Unknown message type:', type)
        sendResponse(ws, 'error', {message: 'Unknown message type'}, id)
    }
  } catch (error) {
    console.error('Error handling message:', error)
    console.error('Raw message:', message.toString())
    sendResponse(ws, 'error', {message: 'Invalid message format'}, 0)
  }
}
