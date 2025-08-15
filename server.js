// server.js
// 예전 UI + 나가기/매칭 버튼 복원
// 이미지: Catbox 업로드 -> Discord Webhook 기록 -> 채팅창엔 이미지 '미리보기'만(텍스트 URL 숨김)

const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

// Node 20+: fetch/FormData/Blob 내장
const CATBOX_API = 'https://catbox.moe/user/api.php';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1405844271424081940/9Xu1-1qINWZWh5EP3jt8AdBZVpGmZY9VGsg1okMvNtFUrcwJ_vX6xaqRDLSiaAxDa8TC';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 정적 파일
app.use(express.static(path.join(__dirname, 'public')));

// 업로드: 메모리 저장(서버 디스크에 안 남김)
const upload = multer({ storage: multer.memoryStorage() });

// 홈
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 이미지 업로드 -> Catbox -> Discord 기록 -> URL 반환
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: '파일 없음' });

    // Catbox로 업로드
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    // req.file.buffer => Blob로 감싸서 파일 이름 전달
    form.append('fileToUpload', new Blob([req.file.buffer], { type: req.file.mimetype || 'application/octet-stream' }), req.file.originalname || 'upload.jpg');

    const catboxResp = await fetch(CATBOX_API, { method: 'POST', body: form });
    const catboxText = await catboxResp.text();

    if (!catboxResp.ok || !/^https?:\/\//.test(catboxText.trim())) {
      console.error('Catbox 업로드 실패:', catboxResp.status, catboxText);
      return res.status(500).json({ ok: false, error: '이미지 업로드 실패(Catbox)' });
    }

    const imageUrl = catboxText.trim();

    // Discord에 URL 기록 (비동기)
    if (DISCORD_WEBHOOK_URL) {
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

    // 클라이언트로 URL 반환
    return res.json({ ok: true, url: imageUrl });
  } catch (e) {
    console.error('업로드 처리 오류:', e);
    return res.status(500).json({ ok: false, error: '서버 오류' });
  }
});

// ===== 랜덤 매칭 =====
let waiting = null;

io.on('connection', (socket) => {
  // 매칭 잡기
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

  // 메시지 포워딩 (텍스트/이미지 공통)
  socket.on('message', (payload) => {
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
    if (!waiting) waiting = socket;
  });

  // 종료 처리
  socket.on('disconnect', () => {
    if (waiting && waiting.id === socket.id) waiting = null;
    if (socket.room) socket.to(socket.room).emit('partnerLeft');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));
