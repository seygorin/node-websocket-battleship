import WebSocket from 'ws'
import {getPlayers, addPlayer} from '../database.js'
import {sendResponse} from '../utils/websocket.js'

export function handlePlayerRequests(ws, data, id) {
  const {name, password} = data

  const players = getPlayers()
  const existingPlayer = players.find((p) => p.name === name)

  let responseData
  if (existingPlayer) {
    if (existingPlayer.password === password) {
      responseData = {
        name: existingPlayer.name,
        index: existingPlayer.index,
        error: false,
        errorText: '',
      }
    } else {
      responseData = {
        name,
        index: -1,
        error: true,
        errorText: 'Invalid password',
      }
    }
  } else {
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
  }

  sendResponse(ws, 'reg', responseData, id)

  const winners = getPlayers().map((p) => ({
    name: p.name,
    wins: p.wins || 0,
  }))
  sendResponse(ws, 'update_winners', winners, 0)
}
