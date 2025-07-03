import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

let pixels = []; // In-memory for now
let round = 1;
let roundEnd = Date.now() + 30000; // 30s round

function resetRound() {
  pixels = [];
  round += 1;
  roundEnd = Date.now() + 30000;
  io.emit('roundReset', { round, roundEnd });
  io.emit('pixels', pixels);
}

io.on('connection', (socket) => {
  // Send current state
  socket.emit('pixels', pixels);
  socket.emit('gameState', { round, roundEnd });

  // Drawing
  socket.on('draw', (pixel) => {
    pixels.push(pixel);
    io.emit('draw', pixel);
  });

  // Erasing
  socket.on('erase', ({x, y}) => {
    pixels = pixels.filter(p => !(p.x === x && p.y === y));
    io.emit('erase', {x, y});
  });

  // Manual round reset (for admin/testing)
  socket.on('resetRound', () => resetRound());
});

setInterval(() => {
  if (Date.now() > roundEnd) resetRound();
}, 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 