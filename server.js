// server.js
// UI 유지, 기능(채팅/매칭/업로드) 복구 버전
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

// Node 18+ : fetch/FormData/Blob 전역 제공
const CATBOX_API = 'https://catbox.moe/user/api.php';
const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ||
  'https://discord.com/api/webhooks/1405844271424081940/9Xu1-1qINWZWh5EP3jt8AdBZVpGmZY9VGsg1okMvNtFUrcwJ_vX6xaqRDLSiaAxDa8TC';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // Render 프록시 환경에서도 안정적으로
  pingTimeout: 30000,
  pingInterval: 25000
});

// 정적 파일
app.use(express.static(path.join(__dirname, 'public')));

// 업로드: 메모리 저장 (서버 디스크 미사용)
const upload = multer({ storage: multer.memoryStorage() });

// 홈
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 이미지 업로드: Catbox -> Discord 기록 -> URL 반환
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: '파일 없음' });

    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append(
      'fileToUpload',
      new Blob([req.file.buffer], { type: req.file.mimetype || 'application/octet-stream' }),
      req.file.originalname || 'upload.jpg'
    );

    const resp = await fetch(CATBOX_API, { method: 'POST', body: form });
    const text = (await resp.text()).trim();
    if (!resp.ok || !/^https?:\/\//.test(text)) {
      console.error('Catbox 업로드 실패:', resp.status, text);
      return res.status(500).json({ ok: false, error: '이미지 업로드 실패' });
    }

    const url = text;

    // Discord에 URL 기록 (비동기)
    if (DISCORD_WEBHOOK_URL) {
      fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: url })
      }).catch(e => console.warn('Discord 전송 실패:', e.message));
    }

    return res.json({ ok: true, url });
  } catch (e) {
    console.error('업로드 오류:', e);
    return res.status(500).json({ ok: false, error: '서버 오류' });
  }
});

// ===== 랜덤 매칭 로직 =====
let waiting = null;

io.on('connection', (socket) => {
  // 매칭
  if (waiting && waiting.connected) {
    const room = `${waiting.id}_${socket.id}`;
    waiting.join(room);
    socket.join(room);
    waiting.room = room;
    socket.room = room;

    waiting.emit('matched');
    socket.emit('matched');

    waiting = null;
  } else {
    waiting = socket;
    socket.room = null;
  }

  // 텍스트/이미지 메시지 중계
  socket.on('message', (payload) => {
    // 자신에게도 표시되도록 echo
    socket.emit('message', payload);
    if (!socket.room) return;
    socket.to(socket.room).emit('message', payload);
  });

  // 나가기/재매칭
  socket.on('leaveRoom', () => {
    if (socket.room) {
      socket.to(socket.room).emit('partnerLeft');
      socket.leave(socket.room);
      socket.room = null;
    }
    // 큐에 넣기
    if (waiting && waiting.id !== socket.id && waiting.connected) {
      const partner = waiting;
      const room = `${partner.id}_${socket.id}`;
      partner.join(room);
      socket.join(room);
      partner.room = room;
      socket.room = room;
      partner.emit('matched');
      socket.emit('matched');
      waiting = null;
    } else {
      waiting = socket;
    }
  });

  socket.on('disconnect', () => {
    if (waiting && waiting.id === socket.id) {
      waiting = null;
    }
    if (socket.room) {
      socket.to(socket.room).emit('partnerLeft');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
