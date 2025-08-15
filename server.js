const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const multer = require('multer');
const path = require('path');

// 이미지 저장 폴더 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

let waitingUser = null;

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 이미지 업로드 처리
app.post('/upload', upload.single('image'), (req, res) => {
    res.json({ url: '/uploads/' + req.file.filename });
});

io.on('connection', (socket) => {
    if (waitingUser) {
        socket.partner = waitingUser;
        waitingUser.partner = socket;
        waitingUser.emit('matched');
        socket.emit('matched');
        waitingUser = null;
    } else {
        waitingUser = socket;
    }

    socket.on('message', (msg) => {
        if (socket.partner) socket.partner.emit('message', msg);
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
http.listen(PORT, () => console.log('Server running on port ' + PORT));
