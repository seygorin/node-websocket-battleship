export function sendResponse(ws, type, data, id, wss = null) {
  const response = {
    type,
    data: JSON.stringify(data),
    id,
  }

  try {
    const messageString = JSON.stringify(response)
    console.log('Sending formatted message:', messageString)

    if (wss) {
      wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(messageString)
        }
      })
    } else if (ws.readyState === ws.OPEN) {
      ws.send(messageString)
    }
  } catch (error) {
    console.error('Error sending message:', error)
  }
}
