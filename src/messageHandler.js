import WebSocket from 'ws'
import {handlePlayerRequests} from './handlers/playerHandler.js'
import {handleRoomRequests} from './handlers/roomHandler.js'
import {handleShipRequests} from './handlers/shipHandler.js'
import {handleGameRequests} from './handlers/gameHandler.js'
import {sendResponse} from './utils/sendResponse.js'

export function handleMessage(ws, message, wss, wsClients) {
  try {
    console.log('MessageHandler: Received raw message:', message.toString())
    const parsedMessage = JSON.parse(message.toString())

    if (typeof parsedMessage.data === 'string' && parsedMessage.data !== '') {
      console.log('MessageHandler: Parsing data string:', parsedMessage.data)
      parsedMessage.data = JSON.parse(parsedMessage.data)
    }

    console.log('MessageHandler: Fully parsed message:', parsedMessage)
    console.log('MessageHandler: wsClients available:', !!wsClients)

    const {type, data, id} = parsedMessage

    switch (type) {
      case 'reg':
        handlePlayerRequests(ws, data, id, wss, wsClients)
        break
      case 'create_room':
      case 'add_user_to_room':
        handleRoomRequests(ws, type, data, id, wss, wsClients)
        break
      case 'add_ships':
        handleShipRequests(ws, data, id, wss, wsClients)
        break
      case 'attack':
      case 'randomAttack':
        handleGameRequests(ws, type, data, id, wss, wsClients)
        break
      default:
        console.error('Unknown message type:', type)
        sendResponse(ws, 'error', {message: 'Unknown message type'}, id)
    }
  } catch (error) {
    console.error('MessageHandler Error:', error)
    console.log('MessageHandler Error State:', {
      ws: ws ? 'exists' : 'null',
      wsClients: wsClients ? 'exists' : 'null',
    })
    sendResponse(ws, 'error', {message: 'Invalid message format'}, 0)
  }
}
