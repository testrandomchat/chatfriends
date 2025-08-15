const socket = io();
const messages = document.getElementById('messages');
const msgInput = document.getElementById('msg');

function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
}

socket.on('matched', () => {
    messages.innerHTML += '<div>상대를 찾았습니다!</div>';
    scrollToBottom();
});

socket.on('message', (msg) => {
    messages.innerHTML += '<div>' + msg + '</div>';
    scrollToBottom();
});

socket.on('partnerLeft', () => {
    messages.innerHTML += '<div>상대가 나갔습니다.</div>';
    scrollToBottom();
});

document.getElementById('send').onclick = sendMessage;

msgInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const msg = msgInput.value;
    if (msg) {
        socket.emit('message', msg);
        messages.innerHTML += '<div style="color:blue;">나: ' + msg + '</div>';
        msgInput.value = '';
        scrollToBottom();
    }
}

document.getElementById('leave').onclick = () => {
    socket.emit('leaveRoom');
    messages.innerHTML += '<div>방을 나갔습니다. 새로 매칭 중...</div>';
    scrollToBottom();
};

document.getElementById('imageUpload').onchange = function() {
    const file = this.files[0];
    const formData = new FormData();
    formData.append('image', file);

    fetch('/upload', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            const imageTag = '<img src="' + data.url + '" width="200">';
            const downloadLink = '<br><a href="' + data.url + '" download>다운로드</a>';
            socket.emit('message', imageTag + downloadLink);
            messages.innerHTML += '<div style="color:blue;">나: ' + imageTag + downloadLink + '</div>';
            scrollToBottom();
        });
};
