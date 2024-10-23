import WebSocket from 'ws'
import {getPlayers, addPlayer} from '../database.js'
import {sendResponse} from '../utils/sendResponse.js'

export function handlePlayerRequests(ws, data, id, wss, wsClients) {
  console.log('PlayerHandler: Starting player request handling')
  console.log('PlayerHandler: Received data:', data)
  console.log('PlayerHandler: Current wsClients:', wsClients)

  const {name, password} = data
  const players = getPlayers()
  const existingPlayer = players.find((p) => p.name === name)

  let responseData
  if (existingPlayer) {
    console.log('PlayerHandler: Found existing player:', existingPlayer)
    if (existingPlayer.password === password) {
      responseData = {
        name: existingPlayer.name,
        index: existingPlayer.index,
        error: false,
        errorText: '',
      }
      console.log('PlayerHandler: Setting current player for connection')
      wsClients.get(ws).currentPlayer = existingPlayer
      console.log('PlayerHandler: Updated wsClients:', wsClients)
    } else {
      responseData = {
        name,
        index: -1,
        error: true,
        errorText: 'Invalid password',
      }
    }
  } else {
    console.log('PlayerHandler: Creating new player')
    const newPlayer = {
      name,
      password,
      index: players.length,
      wins: 0,
    }
    addPlayer(newPlayer)
    responseData = {
      name: newPlayer.name,
      index: newPlayer.index,
      error: false,
      errorText: '',
    }
    console.log('PlayerHandler: Setting current player for new connection')
    wsClients.get(ws).currentPlayer = newPlayer
    console.log('PlayerHandler: Updated wsClients for new player:', wsClients)
  }

  sendResponse(ws, 'reg', responseData, id)

  const winners = getPlayers().map((p) => ({
    name: p.name,
    wins: p.wins || 0,
  }))
  sendResponse(ws, 'update_winners', winners, 0, wss)
}
