import {WebSocket} from 'ws'
import {getGame, updateGame, updatePlayerStats} from '../database.js'
import {sendResponse} from '../utils/sendResponse.js'
import {logger} from '../utils/logger.js'
import {GameStatus} from '../types/gameTypes.js'
import {GameLogic} from '../game/GameLogic.js'

export function handleGameRequests(ws, type, data, id, wss, wsManager) {
  try {
    const {gameId, x, y} = data
    const game = getGame(gameId)
    const currentPlayer = wsManager.getPlayerForClient(ws)

    logger.game('Game request received', {
      type,
      gameId,
      x,
      y,
      requestedPlayer: data.indexPlayer,
      wsPlayer: currentPlayer?.index,
      gameCurrent: game?.currentPlayer,
      gameStatus: game?.status,
    })

    if (!game) {
      logger.error('Game not found', {gameId})
      sendResponse(ws, 'error', {message: 'Game not found'}, id)
      return
    }

    if (!currentPlayer) {
      logger.error('Player not found')
      sendResponse(ws, 'error', {message: 'Player not found'}, id)
      return
    }

    if (game.currentPlayer !== currentPlayer.index) {
      logger.error('Not your turn', {
        currentPlayer: game.currentPlayer,
        playerIndex: currentPlayer.index,
      })
      sendResponse(ws, 'error', {message: 'Not your turn'}, id)
      return
    }

    switch (type) {
      case 'attack':
        handleAttack(ws, game, x, y, wsManager, id)
        break
      case 'randomAttack':
        handleRandomAttack(ws, game, wsManager, id)
        break
      default:
        logger.error('Unknown game request type', {type})
        sendResponse(ws, 'error', {message: 'Unknown game request type'}, id)
    }
  } catch (error) {
    logger.error('Game handling error', {
      error: error.message,
      stack: error.stack,
    })
    sendResponse(ws, 'error', {message: 'Failed to process game request'}, id)
  }
}

function validateGameState(ws, game, indexPlayer, id) {
  if (!game) {
    sendResponse(ws, 'error', {message: 'Game not found'}, id)
    return false
  }

  if (game.status !== GameStatus.PLAYING) {
    sendResponse(ws, 'error', {message: 'Game is not in playing state'}, id)
    return false
  }

  if (game.currentPlayer !== indexPlayer) {
    sendResponse(ws, 'error', {message: 'Not your turn'}, id)
    return false
  }

  return true
}

function handleAttack(ws, game, x, y, wsManager, id) {
  try {
    if (game.status === GameStatus.FINISHED) {
      logger.game('Attempt to attack in finished game', {
        gameId: game.idGame,
        player: game.currentPlayer,
      })
      return
    }

    x
    clearTurnTimer(game.idGame)

    logger.game('Processing attack', {
      x,
      y,
      currentPlayer: game.currentPlayer,
      gameId: game.idGame,
      players: game.players,
      shipsCount: game.ships.length,
      board: game.board,
    })

    const attackResult = GameLogic.processAttack(game, x, y)

    logger.game('Attack result', {
      result: attackResult,
      currentPlayer: game.currentPlayer,
      gameOver: attackResult.gameOver,
    })

    const nextPlayer =
      attackResult.status === 'miss'
        ? game.players.find((p) => p !== game.currentPlayer)
        : game.currentPlayer

    logger.game('Turn transition', {
      currentPlayer: game.currentPlayer,
      nextPlayer,
      attackStatus: attackResult.status,
    })

    const updatedGame = updateGame(game.idGame, {
      board: game.board,
      currentPlayer: nextPlayer,
      status: attackResult.gameOver ? GameStatus.FINISHED : GameStatus.PLAYING,
    })

    if (attackResult.gameOver) {
      logger.game('Game finished', {
        winner: attackResult.winner,
        gameId: game.idGame,
      })

      game.players.forEach((playerId) => {
        const playerWs = wsManager.findPlayerConnection(playerId)
        if (playerWs) {
          sendResponse(
            playerWs,
            'finish',
            {
              winPlayer: attackResult.winner,
            },
            0
          )
        }
      })

      clearTurnTimer(game.idGame)
      return
    }

    game.players.forEach((playerId) => {
      const playerWs = wsManager.findPlayerConnection(playerId)
      if (playerWs) {
        sendResponse(
          playerWs,
          'attack',
          {
            position: {x, y},
            currentPlayer: nextPlayer,
            status: attackResult.status,
          },
          id
        )

        sendResponse(
          playerWs,
          'turn',
          {
            currentPlayer: nextPlayer,
          },
          0
        )

        logger.game('Sent response to player', {
          playerId,
          attackResult,
          nextPlayer,
        })
      }
    })

    setTurnTimer(game, wsManager)
  } catch (error) {
    logger.error('Attack handling error', {
      error: error.message,
      stack: error.stack,
    })
    sendResponse(ws, 'error', {message: 'Failed to process attack'}, id)
  }
}

function handleRandomAttack(ws, game, wsManager, id) {
  try {
    const position = GameLogic.getRandomAttackPosition(game)

    if (!position) {
      logger.game('No available positions for random attack')
      return
    }

    logger.game('Processing random attack', {
      position,
      currentPlayer: game.currentPlayer,
      gameId: game.idGame,
    })

    handleAttack(ws, game, position.x, position.y, wsManager, id)
  } catch (error) {
    logger.error('Random attack error', {
      error: error.message,
      stack: error.stack,
    })
    sendResponse(ws, 'error', {message: 'Failed to process random attack'}, id)
  }
}

function setTurnTimer(game, wsManager) {
  clearTurnTimer(game.idGame)

  const timer = setTimeout(() => {
    const currentPlayerWs = wsManager.findPlayerConnection(game.currentPlayer)
    if (currentPlayerWs) {
      logger.game('Turn timeout, executing random attack', {
        gameId: game.idGame,
        currentPlayer: game.currentPlayer,
      })

      handleRandomAttack(currentPlayerWs, game, wsManager, 0)
    }
  }, 15000)

  turnTimers.set(game.idGame, timer)
}

function clearTurnTimer(gameId) {
  const timer = turnTimers.get(gameId)
  if (timer) {
    clearTimeout(timer)
    turnTimers.delete(gameId)
  }
}

function broadcastGameState(game, attackResult, wsManager) {
  game.players.forEach((playerId) => {
    const playerWs = wsManager.findPlayerConnection(playerId)
    if (playerWs) {
      const playerView = GameLogic.getPlayerGameView(game, playerId)
      sendResponse(
        playerWs,
        'gameState',
        {
          ...playerView,
          attackResult,
          currentPlayer: game.currentPlayer,
        },
        0
      )
    }
  })
}

function updateWinnerStats(winningPlayerId) {}

function isShipHit(ship, x, y) {}

function updateShipStatus(ship, x, y) {}

function isShipSunk(ship) {}

function broadcastTurn(game, wsManager) {
  game.players.forEach((playerId) => {
    const playerWs = wsManager.findPlayerConnection(playerId)
    if (playerWs) {
      sendResponse(
        playerWs,
        'turn',
        {
          currentPlayer: game.currentPlayer,
        },
        0
      )
    }
  })
}

function handleGameOver(game, winner, wsManager) {
  clearTurnTimer(game.idGame)

  updatePlayerStats(winner, 1)

  game.players.forEach((playerId) => {
    const playerWs = wsManager.findPlayerConnection(playerId)
    if (playerWs) {
      sendResponse(
        playerWs,
        'finish',
        {
          winPlayer: winner,
        },
        0
      )
    }
  })

  updateGame(game.idGame, {
    status: GameStatus.FINISHED,
  })
}

let turnTimers = new Map()
