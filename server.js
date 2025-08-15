// server.js
// Catbox 업로드 + Discord Webhook 기록 + 랜덤채팅(이미지는 채팅창에 미리보기만, URL 텍스트는 숨김)

const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

// Node 20+: fetch / FormData / Blob 내장
const CATBOX_API = 'https://catbox.moe/user/api.php';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "REPLACE_WITH_WEBHOOK";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 정적 파일
app.use(express.static(path.join(__dirname, 'public')));

// 업로드(메모리 저장: 서버 디스크에 파일 안 남김)
const upload = multer({ storage: multer.memoryStorage() });

// 루트
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 이미지 업로드 -> Catbox -> Discord 기록 -> URL 반환
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: '파일이 없습니다.' });
    }

    // Catbox 업로드
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', new Blob([req.file.buffer]), req.file.originalname);

    const catboxResp = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form });
    const catboxText = await catboxResp.text();

    if (!catboxResp.ok || !catboxText.startsWith('http')) {
      console.error('Catbox 응답 오류:', catboxResp.status, catboxText);
      return res.status(500).json({ ok: false, error: '이미지 업로드 실패(Catbox)' });
    }

    const imageUrl = catboxText.trim();

    // Discord Webhook 기록 (비동기 처리, 실패해도 업로드는 성공으로 처리)
    if (DISCORD_WEBHOOK_URL && DISCORD_WEBHOOK_URL !== "REPLACE_WITH_WEBHOOK") {
      try {
        await fetch(DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: imageUrl })
        });
      } catch (e) {
        console.warn('Discord 전송 실패:', e.message);
      }
    }

    // 클라이언트에는 URL만 반환 (채팅창에는 이미지 요소로만 표시하도록 프론트 처리)
    return res.json({ ok: true, url: imageUrl });
  } catch (e) {
    console.error('업로드 처리 오류:', e);
    return res.status(500).json({ ok: false, error: '서버 오류' });
  }
});

// ====== 랜덤 매칭 로직 ======
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

  // 텍스트 메시지
  socket.on('message', (msg) => {
    if (!socket.room) return;
    socket.to(socket.room).emit('message', msg);
  });

  // 나가기
  socket.on('leaveRoom', () => {
    if (socket.room) {
      socket.to(socket.room).emit('partnerLeft');
      socket.leave(socket.room);
      socket.room = null;
    }
    if (!waiting) waiting = socket;
  });

  // 연결 종료
  socket.on('disconnect', () => {
    if (waiting && waiting.id === socket.id) waiting = null;
    if (socket.room) socket.to(socket.room).emit('partnerLeft');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
