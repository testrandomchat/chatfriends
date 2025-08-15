const express = require('express');
const path = require('path');
const http = require('http');
const multer = require('multer');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 정적 파일
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 파일 업로드 설정 (uploads/에 저장)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.post('/upload', upload.single('image'), (req, res) => {
  return res.json({ url: `/uploads/${req.file.filename}` });
});

// 랜덤 매칭
let waiting = null;

io.on('connection', (socket) => {
  // 매칭
  if (waiting) {
    const room = `${waiting.id}#${socket.id}`;
    socket.join(room);
    waiting.join(room);
    socket.room = room;
    waiting.room = room;

    socket.emit('matched');
    waiting.emit('matched');

    waiting = null;
  } else {
    waiting = socket;
  }

  // 메시지
  socket.on('message', (msg) => {
    if (!socket.room) return;
    socket.to(socket.room).emit('message', msg);
  });

  // 나가기 / 새 매칭
  socket.on('leaveRoom', () => {
    if (socket.room) {
      socket.to(socket.room).emit('partnerLeft');
      socket.leave(socket.room);
      socket.room = null;
    }
    if (!waiting) waiting = socket;
  });

  // 종료
  socket.on('disconnect', () => {
    if (waiting && waiting.id === socket.id) {
      waiting = null;
    }
    if (socket.room) {
      socket.to(socket.room).emit('partnerLeft');
    }
  });
});

// 루트 경로: 채팅 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
