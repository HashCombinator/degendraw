import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'; // Set this to your Railway backend URL

export const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: true,
}); 