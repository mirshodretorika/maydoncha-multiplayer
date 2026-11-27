const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

const MAX_PLAYERS = 30;
const players = {};
const shirtColors = [0x2563eb, 0xdc2626, 0x16a34a, 0x9333ea, 0xea580c, 0x0d9488, 0xd97706, 0x4f46e5];

let worldTime = 9.0; // Soat 09:00 dan boshlanadi (0 - 24)
const seasons = ['Bahor', 'Yoz', 'Kuz', 'Qish'];
let seasonIndex = 0;

setInterval(() => {
  worldTime += 0.05;
  if (worldTime >= 24) {
    worldTime = 0;
    seasonIndex = (seasonIndex + 1) % seasons.length;
  }
  io.emit('worldSync', {
    time: Number(worldTime.toFixed(2)),
    season: seasons[seasonIndex],
    onlineCount: Object.keys(players).length,
    maxPlayers: MAX_PLAYERS
  });
}, 1000);

io.on('connection', (socket) => {
  if (Object.keys(players).length >= MAX_PLAYERS) {
    socket.emit('serverFull', {
      message: `Shahar to'lgan! Maksimal sig'im: ${MAX_PLAYERS} kishi. Birozdan so'ng urinib ko'ring.`
    });
    socket.disconnect(true);
    return;
  }

  const randomColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];
  players[socket.id] = {
    id: socket.id,
    name: `Fuqaro_${socket.id.slice(0, 4)}`,
    x: 0,
    y: 0,
    z: 18,
    rotY: Math.PI,
    state: 'idle',
    inCar: false,
    carType: null,
    color: randomColor,
    cash: 1500,
    bank: 3500,
    hasPassport: false,
    hasLicense: false,
    wanted: 0,
    jailedUntil: 0,
    job: 'Ishsiz',
    houses: [],
    cars: []
  };

  socket.emit('init', {
    id: socket.id,
    players,
    maxPlayers: MAX_PLAYERS,
    world: { time: worldTime, season: seasons[seasonIndex] }
  });

  socket.broadcast.emit('playerJoined', players[socket.id]);

  socket.on('move', (data) => {
    const p = players[socket.id];
    if (!p) return;
    p.x = data.x;
    p.y = data.y;
    p.z = data.z;
    p.rotY = data.rotY;
    p.state = data.state;
    p.inCar = Boolean(data.inCar);
    p.carType = data.carType || null;
    socket.broadcast.emit('playerMoved', p);
  });

  socket.on('updateProfile', (updates) => {
    const p = players[socket.id];
    if (!p || !updates) return;
    if (typeof updates.name === 'string' && updates.name.trim()) {
      p.name = updates.name.trim().slice(0, 16);
    }
    if (typeof updates.cash === 'number') p.cash = updates.cash;
    if (typeof updates.bank === 'number') p.bank = updates.bank;
    if (typeof updates.hasPassport === 'boolean') p.hasPassport = updates.hasPassport;
    if (typeof updates.hasLicense === 'boolean') p.hasLicense = updates.hasLicense;
    if (typeof updates.wanted === 'number') p.wanted = updates.wanted;
    if (typeof updates.job === 'string') p.job = updates.job;
    io.emit('playerUpdated', p);
  });

  socket.on('chatMessage', (text) => {
    const p = players[socket.id];
    if (!p || typeof text !== 'string' || !text.trim()) return;
    io.emit('chatBroadcast', {
      id: socket.id,
      name: p.name,
      text: text.trim().slice(0, 120)
    });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`3D Mega Shahar Serveri ishga tushdi: http://localhost:${PORT} (Limit: ${MAX_PLAYERS})`);
});
