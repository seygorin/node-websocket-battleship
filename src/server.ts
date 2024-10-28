import {WebSocket, WebSocketServer} from 'ws'
import {createServer, Server} from 'http'
import {handleMessage} from './messageHandler'
import {cleanup} from './database'
import {WebSocketManager} from './network/WebSocketManager'

const WS_PORT: number = 3000
const wsServer: Server = createServer()
const wss: WebSocketServer = new WebSocketServer({server: wsServer})
const wsManager: WebSocketManager = new WebSocketManager()

wss.on('connection', (ws: WebSocket): void => {
  wsManager.addClient(ws)

  ws.on('message', (message: WebSocket.RawData): void => {
    handleMessage(ws, message, wss, wsManager)
  })

  ws.on('error', (error: Error): void => {
    console.error('WebSocket error:', error)
  })

  ws.on('close', (): void => {
    wsManager.removeClient(ws)
  })
})

setInterval(cleanup, 5 * 60 * 1000)

console.log(`Starting WebSocket server on port ${WS_PORT}`)
wsServer.listen(WS_PORT, (): void => {
  console.log(`WebSocket server is running on port ${WS_PORT}`)
})

process.on('SIGTERM', (): void => {
  wsServer.close((): void => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})
