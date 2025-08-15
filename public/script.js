
const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const uploadForm = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");

form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value) {
        socket.emit("chat message", input.value);
        input.value = "";
    }
});

// 엔터만 눌러도 전송
input.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        form.dispatchEvent(new Event("submit"));
    }
});

socket.on("chat message", (msg) => {
    const item = document.createElement("li");
    if (msg.type === "text") {
        item.textContent = msg.content;
    } else if (msg.type === "image") {
        const img = document.createElement("img");
        img.src = msg.content;
        item.appendChild(img);
    }
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
});

// 파일 업로드
uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) return alert("파일을 선택하세요");

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch("/upload", {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        if (!data.success) throw new Error();
    } catch {
        alert("이미지 전송 실패");
    }
});
