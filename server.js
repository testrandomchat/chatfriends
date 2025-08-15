const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

// 루트 경로에서 index.html 제공
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log('새 유저 접속');

  socket.on('message', (msg) => {
    io.emit('message', msg);
  });

  socket.on('disconnect', () => {
    console.log('유저 나감');
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`서버 실행 중: ${PORT}`);
});
