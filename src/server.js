import {WebSocketServer} from 'ws'
import {createServer} from 'http'
import {handleMessage} from './messageHandler.js'
import {initializeInMemoryDB} from './database.js'

const WS_PORT = 3000
const wsServer = createServer()
const wss = new WebSocketServer({server: wsServer})

const wsClients = new Map()

initializeInMemoryDB()

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected')
  wsClients.set(ws, {currentPlayer: null})
  console.log('Current wsClients size:', wsClients.size)

  ws.on('message', (message) => {
    console.log('Received message from client')
    handleMessage(ws, message, wss, wsClients)
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
    wsClients.delete(ws)
  })
})

console.log(`Starting WebSocket server on port ${WS_PORT}`)
wsServer.listen(WS_PORT, () => {
  console.log(`WebSocket server is running on port ${WS_PORT}`)
})
