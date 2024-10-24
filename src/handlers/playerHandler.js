import WebSocket from 'ws'
import {getPlayers, addPlayer} from '../database.js'
import {sendResponse} from '../utils/sendResponse.js'
import {logger} from '../utils/logger.js'

export function handlePlayerRequests(ws, data, id, wss, wsManager) {
  const {name, password} = data
  logger.player('Player request data', {name})

  if (!name || !password) {
    logger.error('Invalid player data', {name})
    sendResponse(
      ws,
      'error',
      {
        message: 'Name and password are required',
        error: true,
        errorText: 'Name and password are required',
      },
      id
    )
    return
  }

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
      wsManager.setPlayerForClient(ws, {
        name: existingPlayer.name,
        index: existingPlayer.index,
        password: existingPlayer.password,
        wins: existingPlayer.wins,
      })
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
    wsManager.setPlayerForClient(ws, newPlayer)
  }

  sendResponse(ws, 'reg', responseData, id)

  const winners = getPlayers().map((p) => ({
    name: p.name,
    wins: p.wins || 0,
  }))
  sendResponse(ws, 'update_winners', winners, 0, wss)
}
