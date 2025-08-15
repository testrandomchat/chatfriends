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
  messages.scrollTop = messages.scrollHeight;
}

socket.on('matched', () => addLine('상대를 찾았습니다!', 'sys'));
socket.on('partnerLeft', () => addLine('상대가 나갔습니다.', 'sys'));

socket.on('message', (payload) => {
  if (typeof payload === 'string') {
    addLine(payload);
    return;
  }
  if (payload.type === 'image' && payload.url) {
    const html = `<img class="chatimg" src="${payload.url}" alt="image">`;
    addLine(html);
    return;
  }
  if (payload.type === 'text' && payload.text) {
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
    const html = `<img class="chatimg" src="${data.url}" alt="image">`;
    socket.emit('message', { type: 'image', url: data.url });
    addLine('나: ' + html, 'mine');
    fileInput.value = '';
  } catch (e) {
    alert('이미지 전송 실패: ' + e.message);
  }
};