import {GameStatus, CellStatus} from '../types/gameTypes'
import {logger} from '../utils/logger'
import {Game, Position, Ship, PlayerIndex} from '../types'

export class GameLogic {
  static processAttack(game, x, y) {
    const result = {
      position: {x, y},
      status: 'miss',
      currentPlayer: game.currentPlayer,
      gameOver: false,
      winner: null,
    }

    const targetShip = this.findShipAtPosition(game, x, y)

    if (targetShip) {
      game.board[y][x] = CellStatus.HIT
      const hitIndex = this.getHitIndex(targetShip.ship, x, y)
      targetShip.ship.hits[hitIndex] = true

      if (this.isShipSunk(targetShip.ship)) {
        result.status = 'killed'
        this.markMissesAroundShip(game, targetShip.ship)

        if (this.isGameOver(game)) {
          result.gameOver = true
          result.winner = game.currentPlayer

          result.loser = game.players.find((p) => p !== game.currentPlayer)

          logger.game('Game over detected', {
            winner: result.winner,
            loser: result.loser,
            currentPlayer: game.currentPlayer,
          })
        }
      } else {
        result.status = 'shot'
      }
    }

    return result
  }

  static findShipAtPosition(game, x, y) {
    const enemyShips = game.ships.find((s) => s.player !== game.currentPlayer)
    logger.game('Finding ship at position', {
      x,
      y,
      currentPlayer: game.currentPlayer,
      enemyShipsCount: enemyShips?.ships?.length,
      firstShipPosition: enemyShips?.ships[0]?.position,
    })

    if (!enemyShips) return null

    for (let i = 0; i < enemyShips.ships.length; i++) {
      const ship = enemyShips.ships[i]
      const positions = this.getShipPositions(ship)

      logger.game('Checking ship', {
        shipIndex: i,
        shipType: ship.type,
        shipLength: ship.length,
        shipDirection: ship.direction,
        shipPosition: ship.position,
        calculatedPositions: positions,
        targetPosition: {x, y},
      })

      if (positions.some((pos) => pos.x === x && pos.y === y)) {
        return {ship, index: i}
      }
    }
    return null
  }

  static getShipPositions(ship) {
    const positions = []
    const x = ship.position.x
    const y = ship.position.y

    logger.game('Getting ship positions', {
      shipPosition: ship.position,
      direction: ship.direction,
      interpretation: ship.direction ? 'horizontal' : 'vertical',
      length: ship.length,
      type: ship.type,
    })

    for (let i = 0; i < ship.length; i++) {
      const pos = {
        x: ship.direction ? x + i : x,
        y: !ship.direction ? y + i : y,
      }

      if (pos.x >= 0 && pos.x < 10 && pos.y >= 0 && pos.y < 10) {
        positions.push(pos)
      }
    }

    logger.game('Calculated ship positions', {
      positions,
      direction: ship.direction,
      interpretation: ship.direction ? 'horizontal' : 'vertical',
      shipType: ship.type,
      originalPosition: ship.position,
    })

    return positions
  }

  static getHitIndex(ship, x, y) {
    const positions = this.getShipPositions(ship)
    return positions.findIndex((pos) => pos.x === x && pos.y === y)
  }

  static isShipSunk(ship) {
    return ship.hits.every((hit) => hit)
  }

  static markMissesAroundShip(game, ship) {
    const positions = this.getShipPositions(ship)
    positions.forEach((pos) => {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const newX = pos.x + dx
          const newY = pos.y + dy
          if (
            this.isValidPosition(newX, newY) &&
            game.board[newY][newX] === CellStatus.EMPTY
          ) {
            game.board[newY][newX] = CellStatus.MISS
          }
        }
      }
    })
  }

  static isValidPosition(x, y) {
    return x >= 0 && x < 10 && y >= 0 && y < 10
  }

  static isGameOver(game) {
    const enemyShips =
      game.ships.find((shipSet) => shipSet.player !== game.currentPlayer)
        ?.ships || []

    const allShipsSunk = enemyShips.every((ship) =>
      ship.hits.every((hit) => hit === true)
    )

    logger.game('Game over check result', {
      allShipsSunk,
      enemyShipsCount: enemyShips.length,
    })

    return allShipsSunk && enemyShips.length > 0
  }

  static getNextPlayer(game) {
    const currentIndex = game.players.indexOf(game.currentPlayer)
    return game.players[(currentIndex + 1) % game.players.length]
  }

  static getPlayerGameView(game, playerId) {
    const isCurrentPlayer = playerId === game.currentPlayer
    const board = game.board.map((row) => [...row])

    if (!isCurrentPlayer) {
      for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
          if (board[y][x] === CellStatus.SHIP) {
            board[y][x] = CellStatus.EMPTY
          }
        }
      }
    }

    return {
      board,
      currentPlayer: game.currentPlayer,
      status: game.status,
    }
  }

  static getRandomCoordinates(board) {
    let x, y
    do {
      x = Math.floor(Math.random() * 10)
      y = Math.floor(Math.random() * 10)
    } while (board[y][x] === CellStatus.MISS || board[y][x] === CellStatus.HIT)
    return {x, y}
  }

  static handleRandomAttack(game) {
    const {x, y} = this.getRandomCoordinates(game.board)
    return this.processAttack(game, x, y)
  }

  static getRandomAttackPosition(game) {
    const size = 10
    const availablePositions = []

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (game.board[y][x] === CellStatus.EMPTY) {
          availablePositions.push({x, y})
        }
      }
    }

    if (availablePositions.length > 0) {
      const randomIndex = Math.floor(Math.random() * availablePositions.length)
      return availablePositions[randomIndex]
    }

    return null
  }
}
