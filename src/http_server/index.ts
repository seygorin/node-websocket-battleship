import * as fs from 'fs'
import * as path from 'path'
import * as http from 'http'
import { IncomingMessage, ServerResponse } from 'http'

export const httpServer = http.createServer(
  function (req: IncomingMessage, res: ServerResponse): void {
    const __dirname: string = path.resolve(path.dirname(''))
    const file_path: string = __dirname + 
      (req.url === '/' ? '/front/index.html' : '/front' + req.url)

    fs.readFile(file_path, function (err: NodeJS.ErrnoException | null, data: Buffer): void {
      if (err) {
        res.writeHead(404)
        res.end(JSON.stringify(err))
        return
      }
      res.writeHead(200)
      res.end(data)
    })
  }
)

httpServer.on('error', (err: Error): void => {
  console.error('HTTP Server Error:', err)
})

process.on('SIGTERM', (): void => {
  httpServer.close((err?: Error): void => {
    if (err) {
      console.error('Error closing HTTP server:', err)
      process.exit(1)
    }
    console.log('HTTP server closed')
    process.exit(0)
  })
})
