import {GameStatus, CellStatus} from '../types/gameTypes.js'
import {logger} from '../utils/logger.js'

export class GameLogic {
  static processAttack(game, x, y) {}

  static getNextPlayer(game) {
    return game.players.find((p) => p !== game.currentPlayer)
  }

  static isShipHit(ship, x, y) {}

  static updateShipStatus(ship, x, y) {}

  static isShipSunk(ship) {}

  static getPlayerGameView(game, playerId) {}

  static getRandomCoordinates(board) {}

  static handleRandomAttack(game) {}
}
