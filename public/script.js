const socket = io();
const messages = document.getElementById('messages');
const msgInput = document.getElementById('msg');
const sendBtn = document.getElementById('send');

socket.on('message', (msg) => {
    const div = document.createElement('div');
    div.textContent = msg;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
});

sendBtn.onclick = () => {
    const msg = msgInput.value;
    if (msg.trim() !== "") {
        socket.emit('message', msg);
        msgInput.value = '';
    }
};
