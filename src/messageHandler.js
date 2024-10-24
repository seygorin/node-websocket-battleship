import WebSocket from 'ws'
import {handlePlayerRequests} from './handlers/playerHandler.js'
import {handleRoomRequests} from './handlers/roomHandler.js'
import {handleShipRequests} from './handlers/shipHandler.js'
import {handleGameRequests} from './handlers/gameHandler.js'
import {sendResponse} from './utils/sendResponse.js'
import {logger} from './utils/logger.js'

const MessageTypes = {
  REGISTER: 'reg',
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'add_user_to_room',
  ADD_SHIPS: 'add_ships',
  ATTACK: 'attack',
  RANDOM_ATTACK: 'randomAttack',
}

const messageHandlers = {
  [MessageTypes.REGISTER]: handlePlayerRequests,
  [MessageTypes.CREATE_ROOM]: (ws, data, id, wss, wsManager) =>
    handleRoomRequests(ws, MessageTypes.CREATE_ROOM, data, id, wss, wsManager),
  [MessageTypes.JOIN_ROOM]: (ws, data, id, wss, wsManager) =>
    handleRoomRequests(ws, MessageTypes.JOIN_ROOM, data, id, wss, wsManager),
  [MessageTypes.ADD_SHIPS]: handleShipRequests,
  [MessageTypes.ATTACK]: (ws, data, id, wss, wsManager) =>
    handleGameRequests(ws, MessageTypes.ATTACK, data, id, wss, wsManager),
  [MessageTypes.RANDOM_ATTACK]: (ws, data, id, wss, wsManager) =>
    handleGameRequests(
      ws,
      MessageTypes.RANDOM_ATTACK,
      data,
      id,
      wss,
      wsManager
    ),
}

export function handleMessage(ws, message, wss, wsManager) {
  let parsedMessage
  try {
    parsedMessage = JSON.parse(message)
    const {type, data, id} = parsedMessage

    let parsedData = data
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data)
      } catch (e) {
        logger.error('Failed to parse data string', {data, error: e.message})
      }
    }

    logger.game('Received message', {type, data: parsedData})

    const handler = messageHandlers[type]
    if (handler) {
      handler(ws, parsedData, id, wss, wsManager)
    } else {
      logger.error('Unknown message type', {type})
      sendResponse(ws, 'error', {message: 'Unknown message type'}, id || 0)
    }
  } catch (error) {
    logger.error('Message handling error', {
      error: error.message,
      stack: error.stack,
      receivedMessage: message,
    })
    const messageId = parsedMessage?.id || 0
    sendResponse(ws, 'error', {message: 'Failed to process message'}, messageId)
  }
}
