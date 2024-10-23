import { httpServer } from './src/http_server/index.js';
import './src/server.js';

const HTTP_PORT = 8181;

console.log(`Starting HTTP server on port ${HTTP_PORT}`);
httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP server is running on port ${HTTP_PORT}`);
});
