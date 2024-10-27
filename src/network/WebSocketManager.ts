import { WebSocket } from 'ws';
import { logger } from '../utils/logger';

interface Player {
  name: string;
  index: number;
  password: string;
  wins: number;
}

interface ClientData {
  currentPlayer: Player | null;
}

export class WebSocketManager {
  private clients: Map<WebSocket, ClientData>;

  constructor() {
    this.clients = new Map();
  }

  addClient(ws: WebSocket): void {
    this.clients.set(ws, { currentPlayer: null });
    logger.game('New client connected', { totalClients: this.clients.size });
  }

  removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
    logger.game('Client disconnected', { totalClients: this.clients.size });
  }

  setPlayerForClient(ws: WebSocket, player: Partial<Player>): void {
    const client = this.clients.get(ws);
    if (client && player && player.name) {
      client.currentPlayer = {
        name: player.name,
        index: player.index!,
        password: player.password!,
        wins: player.wins || 0,
      };
      logger.player('Player set for client', {
        player: client.currentPlayer,
        clientsSize: this.clients.size,
      });
    } else {
      logger.error('Invalid player data in setPlayerForClient', { player });
    }
  }

  getPlayerForClient(ws: WebSocket): Player | null {
    const client = this.clients.get(ws);
    const player = client?.currentPlayer;
    logger.player('Get player for client', {
      player,
      clientsSize: this.clients.size,
      hasClient: !!client,
      hasPlayer: !!player,
    });
    return player;
  }

  findPlayerConnection(playerId: number): WebSocket | undefined {
    const entry = Array.from(this.clients.entries()).find(
      ([_, client]) => client.currentPlayer?.index === playerId
    );
    return entry?.[0];
  }

  getAllClients(): [WebSocket, ClientData][] {
    return Array.from(this.clients.entries());
  }
}
