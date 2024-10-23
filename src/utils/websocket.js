export function sendResponse(ws, type, data, id) {
  if (ws.readyState === ws.OPEN) {
    const response = {
      type,
      data: JSON.stringify(data),
      id,
    }

    try {
      const messageString = JSON.stringify(response)
      console.log('Sending formatted message:', messageString)
      ws.send(messageString)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }
}
