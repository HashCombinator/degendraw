import { socket } from './socketService';

export const gameServiceSocket = {
  async placePixel(x: number, y: number, color: string) {
    socket.emit('draw', { x, y, color });
  },
  async erasePixel(x: number, y: number) {
    socket.emit('erase', { x, y });
  },
  async getPixels() {
    return new Promise((resolve) => {
      socket.once('pixels', (pixels) => resolve(pixels));
      socket.emit('getPixels');
    });
  },
  subscribeToPixels(callback) {
    socket.on('draw', callback);
    socket.on('erase', callback); // You may want to handle erase differently
    socket.on('pixels', callback);
  },
  async sendChatMessage(username, content) {
    socket.emit('chat', { username, content, timestamp: Date.now() });
  },
  subscribeToChat(callback) {
    socket.on('chat', callback);
  },
  async getGameState() {
    return new Promise((resolve) => {
      socket.once('gameState', (state) => resolve(state));
      socket.emit('getGameState');
    });
  },
  subscribeToGameState(callback) {
    socket.on('gameState', callback);
    socket.on('roundReset', callback);
  },
  async manualReset() {
    socket.emit('resetRound');
  },
}; 