import { WebSocket, WebSocketServer } from 'ws';
import { getPlayers, addPlayer } from '../database';
import { sendResponse } from '../utils/sendResponse';
import { logger } from '../utils/logger';
import { WebSocketManager } from '../network/WebSocketManager';
import { Player } from '../types/database';

interface PlayerRequestData {
  name: string;
  password: string;
}

interface PlayerResponseData {
  name: string;
  index: number;
  error: boolean;
  errorText: string;
}

interface WinnerData {
  name: string;
  wins: number;
}

export function handlePlayerRequests(
  ws: WebSocket,
  data: PlayerRequestData,
  id: number,
  wss: WebSocketServer,
  wsManager: WebSocketManager
): void {
  const { name, password } = data;
  logger.player('Player request data', { name });

  if (!name || !password) {
    logger.error('Invalid player data', { name });
    sendResponse(
      ws,
      'error',
      {
        message: 'Name and password are required',
        error: true,
        errorText: 'Name and password are required',
      },
      id
    );
    return;
  }

  const players: Player[] = getPlayers();
  const existingPlayer = players.find((p) => p.name === name);

  let responseData: PlayerResponseData;

  if (existingPlayer) {
    if (existingPlayer.password === password) {
      responseData = {
        name: existingPlayer.name,
        index: existingPlayer.index,
        error: false,
        errorText: '',
      };
      wsManager.setPlayerForClient(ws, {
        name: existingPlayer.name,
        index: existingPlayer.index,
        password: existingPlayer.password,
        wins: existingPlayer.wins,
      });
    } else {
      responseData = {
        name,
        index: -1,
        error: true,
        errorText: 'Invalid password',
      };
    }
  } else {
    const newPlayer: Player = {
      name,
      password,
      index: players.length,
      wins: 0,
    };
    addPlayer(newPlayer);
    responseData = {
      name: newPlayer.name,
      index: newPlayer.index,
      error: false,
      errorText: '',
    };
    wsManager.setPlayerForClient(ws, newPlayer);
  }

  sendResponse(ws, 'reg', responseData, id);

  const winners: WinnerData[] = getPlayers().map((p) => ({
    name: p.name,
    wins: p.wins || 0,
  }));
  sendResponse(ws, 'update_winners', winners, 0, wss);
}
