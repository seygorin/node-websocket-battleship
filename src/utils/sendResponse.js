export function sendResponse(ws, type, data, id, wss = null) {
  const response = {
    type,
    data: JSON.stringify(data),
    id,
  }

  const message = JSON.stringify(response)

  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  } else {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message)
    }
  }
}
