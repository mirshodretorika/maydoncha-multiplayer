const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// public papkasidagi index.html ni ochish
app.use(express.static(path.join(__dirname, 'public')));

// Barcha ulangan o'yinchilar ro'yxati
const players = {};

// Ranglar ro'yxati (har bir o'yinchiga har xil kiyim rangi)
const shirtColors = [0x2980b9, 0xe74c3c, 0x27ae60, 0x8e44ad, 0xd35400, 0x16a085, 0xf39c12, 0x2c3e50];

io.on('connection', (socket) => {
  console.log(`Yangi o'yinchi ulandi: ${socket.id}`);

  // Yangi o'yinchi uchun boshlang'ich ma'lumot
  const randomColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];
  players[socket.id] = {
    id: socket.id,
    name: `O'yinchi_${socket.id.slice(0, 4)}`,
    x: (Math.random() - 0.5) * 8,
    y: 0,
    z: 12 + (Math.random() - 0.5) * 4,
    rotY: 0,
    state: 'idle', // idle, walk, run, jump, sit
    color: randomColor
  };

  // 1. Yangi kirgan o'yinchiga o'zining ID sini va oldindan o'ynayotgan barcha o'yinchilarni yuborish
  socket.emit('init', {
    id: socket.id,
    players: players
  });

  // 2. Qolgan barcha o'yinchilarga yangi o'yinchi qo'shilganini xabar berish
  socket.broadcast.emit('playerJoined', players[socket.id]);

  // 3. O'yinchi harakatlanganda koordinatalarini qabul qilish va boshqalarga tarqatish
  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      players[socket.id].rotY = data.rotY;
      players[socket.id].state = data.state;

      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  // 4. O'yinchi ismini o'zgartirsa (keyingi qadamda ism kiritish ham qo'shamiz)
  socket.on('setName', (name) => {
    if (players[socket.id] && typeof name === 'string') {
      players[socket.id].name = name.trim().slice(0, 16) || players[socket.id].name;
      io.emit('playerUpdated', players[socket.id]);
    }
  });

  // 5. O'yinchi chiqib ketganda ro'yxatdan o'chirish
  socket.on('disconnect', () => {
    console.log(`O'yinchi chiqdi: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server ishga tushdi: http://localhost:${PORT}`);
});