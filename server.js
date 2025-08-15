
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const upload = multer({ dest: "uploads/" });

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1405844271424081940/9Xu1-1qINWZWh5EP3jt8AdBZVpGmZY9VGsg1okMvNtFUrcwJ_vX6xaqRDLSiaAxDa8TC";

app.use(express.static("public"));

io.on("connection", (socket) => {
    socket.on("chat message", (msg) => {
        io.emit("chat message", { text: msg });
    });
});

app.post("/upload", upload.single("image"), async (req, res) => {
    try {
        const filePath = req.file.path;
        const fileName = req.file.originalname;

        const formData = new FormData();
        formData.append("reqtype", "fileupload");
        formData.append("fileToUpload", fs.createReadStream(filePath), fileName);

        const catboxRes = await axios.post("https://catbox.moe/user/api.php", formData, {
            headers: formData.getHeaders(),
        });

        const imageUrl = catboxRes.data.trim();

        // 채팅방에 이미지를 직접 표시
        io.emit("chat message", { text: `<img src="${imageUrl}" alt="uploaded image" style="max-width:200px;">` });

        // Discord에는 URL만 전송
        await axios.post(DISCORD_WEBHOOK_URL, {
            content: imageUrl
        });

        fs.unlinkSync(filePath); // 로컬 파일 삭제

        res.json({ success: true, url: imageUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "이미지 업로드 실패" });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
