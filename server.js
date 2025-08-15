const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

let waitingUser = null;

io.on("connection", (socket) => {
    console.log("사용자 접속:", socket.id);

    if (waitingUser) {
        const room = socket.id + "#" + waitingUser.id;
        socket.join(room);
        waitingUser.join(room);
        socket.room = room;
        waitingUser.room = room;

        socket.emit("matched");
        waitingUser.emit("matched");

        waitingUser = null;
    } else {
        waitingUser = socket;
    }

    socket.on("message", (msg) => {
        if (socket.room) {
            socket.to(socket.room).emit("message", msg);
        }
    });

    socket.on("leaveRoom", () => {
        if (socket.room) {
            socket.to(socket.room).emit("partnerLeft");
            socket.leave(socket.room);
            socket.room = null;
            if (!waitingUser) waitingUser = socket;
        }
    });

    socket.on("disconnect", () => {
        if (socket.room) {
            socket.to(socket.room).emit("partnerLeft");
        }
        if (waitingUser === socket) waitingUser = null;
        console.log("사용자 종료:", socket.id);
    });
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

app.post("/upload", upload.single("image"), (req, res) => {
    res.json({ url: "/uploads/" + req.file.filename });
});

server.listen(3000, () => {
    console.log("서버 실행중 → http://localhost:3000");
});
