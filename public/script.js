const socket = io();
const messages = document.getElementById('messages');
const msgInput = document.getElementById('msg');
const sendBtn = document.getElementById('send');
const fileInput = document.getElementById('imageUpload');
const sendImageBtn = document.getElementById('sendImage');
const leaveBtn = document.getElementById('leave');

function addLine(html, cls='') {
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.innerHTML = html;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight; // 자동 스크롤
}

// 시스템 알림
socket.on('matched', () => addLine('상대를 찾았습니다!', 'sys'));
socket.on('partnerLeft', () => addLine('상대가 나갔습니다.', 'sys'));

// 메시지 수신
socket.on('message', (payload) => {
  if (!payload) return;
  // 텍스트
  if (payload.type === 'text' && payload.text) {
    addLine(payload.text);
    return;
  }
  // 이미지
  if (payload.type === 'image' && payload.url) {
    const safeUrl = (payload.url || '').trim();
    const html = `<img class="chatimg" src="${safeUrl}" alt="image">`;
    addLine(html);
    return;
  }
  // 서버에서 문자열만 보낸 경우 대비
  if (typeof payload === 'string') {
    addLine(payload);
  }
});

function sendMessage() {
  const msg = msgInput.value.trim();
  if (!msg) return;
  // 내 화면에 먼저 표시
  addLine('나: ' + msg, 'mine');
  // 상대에게 전달
  socket.emit('message', { type: 'text', text: '상대: ' + msg });
  msgInput.value = '';
}

sendBtn.onclick = sendMessage;
msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

leaveBtn.onclick = () => {
  socket.emit('leaveRoom');
  addLine('방을 나갔습니다. 새로 매칭 중...', 'sys');
};

// === 이미지 업로드 ===
sendImageBtn.onclick = async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert('먼저 이미지를 선택하세요.');
    return;
  }
  const form = new FormData();
  form.append('image', file);

  try {
    const res = await fetch('/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (!data.ok || !data.url) throw new Error(data.error || '업로드 실패');

    const safeUrl = data.url.trim();
    const html = `<img class="chatimg" src="${safeUrl}" alt="image">`;
    // 내 화면
    addLine('나: ' + html, 'mine');
    // 상대에게도 이미지 알림
    socket.emit('message', { type: 'image', url: safeUrl });
    fileInput.value = '';
  } catch (e) {
    console.error(e);
    alert('이미지 전송 실패: ' + e.message);
  }
};
