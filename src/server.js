import {WebSocketServer} from 'ws'
import {createServer} from 'http'
import {handleMessage} from './messageHandler.js'
import {cleanup} from './database.js'
import {WebSocketManager} from './network/WebSocketManager.js'

const WS_PORT = 3000
const wsServer = createServer()
const wss = new WebSocketServer({server: wsServer})
const wsManager = new WebSocketManager()

wss.on('connection', (ws) => {
  wsManager.addClient(ws)

  ws.on('message', (message) => {
    handleMessage(ws, message, wss, wsManager)
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })

  ws.on('close', () => {
    wsManager.removeClient(ws)
  })
})

setInterval(cleanup, 5 * 60 * 1000)

console.log(`Starting WebSocket server on port ${WS_PORT}`)
wsServer.listen(WS_PORT, () => {
  console.log(`WebSocket server is running on port ${WS_PORT}`)
})
