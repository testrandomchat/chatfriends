const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 업로드 폴더 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'public', 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));

app.post('/upload', upload.single('image'), (req, res) => {
    res.json({ url: '/uploads/' + req.file.filename });
});

let waitingUser = null;

io.on('connection', (socket) => {
    console.log('새 유저 접속:', socket.id);

    if (waitingUser) {
        const room = socket.id + '#' + waitingUser.id;
        socket.join(room);
        waitingUser.join(room);
        socket.room = room;
        waitingUser.room = room;

        socket.emit('matched');
        waitingUser.emit('matched');

        waitingUser = null;
    } else {
        waitingUser = socket;
    }

    socket.on('message', (msg) => {
        if (socket.room) {
            socket.to(socket.room).emit('message', msg);
        }
    });

    socket.on('leaveRoom', () => {
        if (socket.room) {
            socket.to(socket.room).emit('partnerLeft');
            socket.leave(socket.room);
            socket.room = null;
        }
        if (!waitingUser) {
            waitingUser = socket;
        }
    });

    socket.on('disconnect', () => {
        if (waitingUser && waitingUser.id === socket.id) {
            waitingUser = null;
        }
        if (socket.room) {
            socket.to(socket.room).emit('partnerLeft');
        }
    });
});

// Render 환경에 맞게 포트 설정
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
