
// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const upload = multer({ dest: 'uploads/' });

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1405844271424081940/9Xu1-1qINWZWh5EP3jt8AdBZVpGmZY9VGsg1okMvNtFUrcwJ_vX6xaqRDLSiaAxDa8TC";

app.use(express.static(path.join(__dirname, 'public')));

app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: '파일 없음' });

        const filePath = path.join(__dirname, req.file.path);
        const fileName = req.file.originalname;

        // Discord로 전송
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath), fileName);

        await fetch(DISCORD_WEBHOOK_URL, { method: 'POST', body: formData });

        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });

    } catch (err) {
        console.error('이미지 업로드 실패:', err);
        res.status(500).json({ error: '업로드 실패' });
    }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let waitingUser = null;

io.on('connection', (socket) => {
    if (waitingUser) {
        const partner = waitingUser;
        waitingUser = null;
        socket.partner = partner;
        partner.partner = socket;
        socket.emit('matched');
        partner.emit('matched');
    } else {
        waitingUser = socket;
    }

    socket.on('message', (msg) => {
        if (socket.partner) {
            socket.partner.emit('message', msg);
        }
    });

    socket.on('leaveRoom', () => {
        if (socket.partner) {
            socket.partner.emit('partnerLeft');
            socket.partner.partner = null;
            socket.partner = null;
        }
        if (waitingUser === socket) waitingUser = null;
    });

    socket.on('disconnect', () => {
        if (socket.partner) {
            socket.partner.emit('partnerLeft');
            socket.partner.partner = null;
        }
        if (waitingUser === socket) waitingUser = null;
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
