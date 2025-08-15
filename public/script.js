
const socket = io();
const messages = document.getElementById('messages');
const msgInput = document.getElementById('msg');
const imageInput = document.getElementById('imageUpload');

socket.on('matched', () => {
    messages.innerHTML += '<div>상대를 찾았습니다!</div>';
});

socket.on('message', (msg) => {
    messages.innerHTML += '<div>' + msg + '</div>';
});

socket.on('partnerLeft', () => {
    messages.innerHTML += '<div>상대가 나갔습니다.</div>';
});

document.getElementById('send').onclick = sendMessage;
document.getElementById('sendImage').onclick = sendImage;

// 엔터로 메시지 전송
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const msg = msgInput.value;
    if (msg) {
        socket.emit('message', msg);
        messages.innerHTML += '<div style="color:blue;">나: ' + msg + '</div>';
        msgInput.value = '';
    }
}

function sendImage() {
    const file = imageInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    fetch('/upload', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if (data.url) {
                const imgTag = '<img src="' + data.url + '" width="200">';
                socket.emit('message', imgTag);
                messages.innerHTML += '<div style="color:blue;">나: ' + imgTag + '</div>';
            } else {
                alert('이미지 업로드 실패');
            }
        })
        .catch(() => alert('이미지 업로드 실패'));
}

document.getElementById('leave').onclick = () => {
    socket.emit('leaveRoom');
    messages.innerHTML += '<div>방을 나갔습니다. 새로 매칭 중...</div>';
};
