import {Server} from 'http'
import {httpServer} from './http_server/index'
import './server'

const HTTP_PORT: number = 8181

console.log(`Starting HTTP server on port ${HTTP_PORT}`)
httpServer.listen(HTTP_PORT, (): void => {
  console.log(`HTTP server is running on port ${HTTP_PORT}`)
})

process.on('SIGTERM', (): void => {
  httpServer.close((): void => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})
