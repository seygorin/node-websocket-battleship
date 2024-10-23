let players = [];
let rooms = [];
let games = [];

export function initializeInMemoryDB() {
  players = [];
  rooms = [];
  games = [];
}

export function getPlayers() {
  return players;
}

export function addPlayer(player) {
  players.push(player);
}

export function getRooms() {
  return rooms;
}

export function addRoom(room) {
  rooms.push(room);
}

export function getGames() {
  return games;
}

export function addGame(game) {
  games.push(game);
}
