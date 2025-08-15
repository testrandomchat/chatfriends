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

// 메시지 수신 (텍스트/이미지 구분)
socket.on('message', (payload) => {
  if (typeof payload === 'string') {
    addLine(payload);
    return;
  }
  if (payload && payload.type === 'image' && payload.url) {
    const safeUrl = payload.url.trim();
    const html = `<img class="chatimg" src="${safeUrl}" alt="image" style="max-width: 100%; height: auto;">`;
    addLine(html);
    return;
}" alt="image">`;
    addLine(html);
    return;
  }
  if (payload && payload.type === 'text' && payload.text) {
    addLine(payload.text);
  }
});

function sendMessage() {
  const msg = msgInput.value.trim();
  if (!msg) return;
  socket.emit('message', { type: 'text', text: '나: ' + msg });
  addLine('나: ' + msg, 'mine');
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

    // 채팅창에는 URL 텍스트 없이 이미지 엘리먼트만 표시
    const html = `<img class="chatimg" src="${data.url}" alt="image">`;
    // 상대에게도 이미지 타입으로 전송
    socket.emit('message', { type: 'image', url: data.url });
    addLine('나: ' + html, 'mine');

    fileInput.value = '';
  } catch (e) {
    console.error(e);
    alert('이미지 전송 실패: ' + e.message);
  }
};
