import {WebSocket, WebSocketServer} from 'ws'
import {handlePlayerRequests} from './handlers/playerHandler'
import {handleRoomRequests} from './handlers/roomHandler'
import {handleShipRequests} from './handlers/shipHandler'
import {handleGameRequests} from './handlers/gameHandler'
import {sendResponse} from './utils/sendResponse'
import {handleSinglePlay} from './handlers/singlePlayHandler'
import {logger} from './utils/logger'
import {WebSocketManager} from './network/WebSocketManager'

const MessageTypes = {
  REGISTER: 'reg',
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'add_user_to_room',
  ADD_SHIPS: 'add_ships',
  ATTACK: 'attack',
  RANDOM_ATTACK: 'randomAttack',
  START_GAME: 'start_game',
  TURN: 'turn',
  FINISH: 'finish',
  SINGLE_PLAY: 'single_play',
} as const

type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes]

interface Message {
  type: MessageType
  data: string | any
  id: number
}

type MessageHandler = (
  ws: WebSocket,
  data: any,
  id: number,
  wss: WebSocketServer,
  wsManager: WebSocketManager
) => void

const messageHandlers: Record<MessageType, MessageHandler> = {
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
  [MessageTypes.SINGLE_PLAY]: handleSinglePlay,
  [MessageTypes.START_GAME]: () => {}, 
  [MessageTypes.TURN]: () => {}, 
  [MessageTypes.FINISH]: () => {},
}

export function handleMessage(
  ws: WebSocket,
  message: WebSocket.RawData,
  wss: WebSocketServer,
  wsManager: WebSocketManager
): void {
  let parsedMessage: Message | undefined

  try {
    parsedMessage = JSON.parse(message.toString()) as Message
    const {type, data, id} = parsedMessage

    let parsedData: any = data
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data)
      } catch (e) {
        logger.error('Failed to parse data string', {
          data,
          error: (e as Error).message,
        })
      }
    }

    logger.game('Received message', {type, data: parsedData})

    const handler = messageHandlers[type as MessageType]
    if (handler) {
      handler(ws, parsedData, id, wss, wsManager)
    } else {
      logger.error('Unknown message type', {type})
      sendResponse(ws, 'error', {message: 'Unknown message type'}, id || 0)
    }
  } catch (error) {
    logger.error('Message handling error', {
      error: (error as Error).message,
      stack: (error as Error).stack,
      receivedMessage: message,
    })
    const messageId = parsedMessage?.id || 0
    sendResponse(ws, 'error', {message: 'Failed to process message'}, messageId)
  }
}
