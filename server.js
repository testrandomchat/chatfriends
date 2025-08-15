// server.js
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

const CATBOX_API = 'https://catbox.moe/user/api.php';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1405844271424081940/9Xu1-1qINWZWh5EP3jt8AdBZVpGmZY9VGsg1okMvNtFUrcwJ_vX6xaqRDLSiaAxDa8TC';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: '파일 없음' });

    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);

    const catboxResp = await fetch(CATBOX_API, { method: 'POST', body: form });
    const catboxText = (await catboxResp.text()).trim();

    if (!catboxResp.ok || !/^https?:\/\//.test(catboxText)) {
      return res.status(500).json({ ok: false, error: '이미지 업로드 실패' });
    }

    if (DISCORD_WEBHOOK_URL) {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: catboxText })
      });
    }

    res.json({ ok: true, url: catboxText });
  } catch (e) {
    res.status(500).json({ ok: false, error: '서버 오류' });
  }
});

let waiting = null;

io.on('connection', (socket) => {
  if (waiting) {
    const room = waiting.id + '#' + socket.id;
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

  socket.on('message', (payload) => {
    if (!socket.room) return;
    socket.to(socket.room).emit('message', payload);
  });

  socket.on('leaveRoom', () => {
    if (socket.room) {
      socket.to(socket.room).emit('partnerLeft');
      socket.leave(socket.room);
      socket.room = null;
    }
    if (!waiting) waiting = socket;
  });

  socket.on('disconnect', () => {
    if (waiting && waiting.id === socket.id) waiting = null;
    if (socket.room) socket.to(socket.room).emit('partnerLeft');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));