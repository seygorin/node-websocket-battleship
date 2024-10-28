import { WebSocket, WebSocketServer } from 'ws';

interface ResponseData {
  type: string;
  data: string;
  id: number;
}

export function sendResponse(
  ws: WebSocket,
  type: string,
  data: any,
  id: number,
  wss: WebSocketServer | null = null
): void {
  const response: ResponseData = {
    type,
    data: JSON.stringify(data),
    id,
  };

  const message: string = JSON.stringify(response);

  if (wss) {
    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } else {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}
