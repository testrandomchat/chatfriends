
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const fetch = require("node-fetch");
const FormData = require("form-data");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ storage: multer.memoryStorage() });

// Discord Webhook URL
const DISCORD_WEBHOOK = "YOUR_DISCORD_WEBHOOK";

io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("chat message", (msg) => {
        io.emit("chat message", { type: "text", content: msg });
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

// Catbox 이미지 업로드 API
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const formData = new FormData();
        formData.append("reqtype", "fileupload");
        formData.append("fileToUpload", req.file.buffer, req.file.originalname);

        const catboxRes = await fetch("https://catbox.moe/user/api.php", {
            method: "POST",
            body: formData
        });

        const url = await catboxRes.text();

        // 채팅창에 이미지 표시
        io.emit("chat message", { type: "image", content: url });

        // Discord로 URL 전송
        await fetch(DISCORD_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: url })
        });

        res.json({ success: true, url });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
