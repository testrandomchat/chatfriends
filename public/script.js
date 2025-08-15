
document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const form = document.getElementById("form");
    const input = document.getElementById("input");
    const messages = document.getElementById("messages");
    const imageForm = document.getElementById("imageForm");
    const imageInput = document.getElementById("imageInput");

    socket.on("chat message", (msg) => {
        const item = document.createElement("li");
        item.innerHTML = msg.text;
        messages.appendChild(item);
        window.scrollTo(0, document.body.scrollHeight);
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (input.value) {
            socket.emit("chat message", input.value);
            input.value = "";
        }
    });

    // 엔터키로 메시지 전송
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            form.dispatchEvent(new Event("submit"));
        }
    });

    // 이미지 업로드
    imageForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (imageInput.files.length === 0) return;

        const formData = new FormData();
        formData.append("image", imageInput.files[0]);

        const res = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        if (!data.success) {
            alert("이미지 업로드 실패");
        }
        imageInput.value = "";
    });
});
