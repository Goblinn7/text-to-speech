// ===============================
// HISTORY SYSTEM (API VERSION)
// ===============================

// Ambil user login
function getCurrentUser() {
    return localStorage.getItem("currentUser");
}

// ===============================
// TAMBAH HISTORY
// ===============================
async function saveHistory(text, result = "") {
    const user = getCurrentUser();
    if (!user) return;

    try {
        await fetch("/api/history", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: user,
                text,
                result
            })
        });

        renderHistory();
    } catch (err) {
        console.error("Gagal simpan history:", err);
    }
}

// ===============================
// TAMPILKAN HISTORY
// ===============================
async function renderHistory() {
    const user = getCurrentUser();
    const container = document.getElementById("historyContainer");

    if (!container || !user) return;

    try {
        const res = await fetch(`/api/history?user=${user}`);
        const data = await res.json();

        container.innerHTML = "";

        if (!data || data.length === 0) {
            container.innerHTML = "<p style='opacity:0.6'>Belum ada history</p>";
            return;
        }

        data.reverse().forEach((item, index) => {
            const div = document.createElement("div");
            div.className = "history-item";

            div.innerHTML = `
                <p><b>Text:</b> ${item.text}</p>
                ${item.result ? `<p><b>Result:</b> ${item.result}</p>` : ""}
                <small>${item.date}</small>
                <br>
                <button onclick="deleteHistory('${item._id}')">Hapus</button>
                <hr>
            `;

            container.appendChild(div);
        });

    } catch (err) {
        console.error("Gagal load history:", err);
    }
}

// ===============================
// HAPUS SATU HISTORY
// ===============================
async function deleteHistory(id) {
    if (!confirm("Hapus history ini?")) return;

    try {
        await fetch(`/api/history?id=${id}`, {
            method: "DELETE"
        });

        renderHistory();
    } catch (err) {
        console.error("Gagal hapus:", err);
    }
}

// ===============================
// HAPUS SEMUA HISTORY
// ===============================
async function clearHistory() {
    const user = getCurrentUser();

    if (!confirm("Hapus semua history?")) return;

    try {
        await fetch(`/api/history?user=${user}`, {
            method: "DELETE"
        });

        renderHistory();
    } catch (err) {
        console.error("Gagal clear:", err);
    }
}

// ===============================
// AUTO LOAD
// ===============================
window.addEventListener("load", () => {
    setTimeout(() => {
        renderHistory();
    }, 500);
});