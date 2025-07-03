import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'https://degendraw-production.up.railway.app'; // Railway backend URL

export const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: true,
}); 