// ===============================
// ADMIN SYSTEM (MONGODB VERSION)
// ===============================

// ===============================
// CEK AKSES ADMIN
// ===============================
function isAdmin() {
    return localStorage.getItem("role") === "admin";
}

// ===============================
// FETCH DATA DARI API
// ===============================
async function fetchUsers() {
    try {
        const res = await fetch("/api/admin/users");
        return await res.json();
    } catch {
        return [];
    }
}

async function fetchHistories() {
    try {
        const res = await fetch("/api/admin/histories");
        return await res.json();
    } catch {
        return {};
    }
}

// ===============================
// RENDER ADMIN PANEL
// ===============================
async function renderAdminPanel() {
    if (!isAdmin()) return;

    const container = document.getElementById("adminContainer");
    if (!container) return;

    container.innerHTML = "<h2>Admin Dashboard</h2><p>Loading...</p>";

    const users = await fetchUsers();
    const histories = await fetchHistories();

    container.innerHTML = "<h2>Admin Dashboard</h2>";

    if (!users || users.length === 0) {
        container.innerHTML += "<p>Tidak ada user</p>";
        return;
    }

    users.forEach((user, index) => {
        const userDiv = document.createElement("div");
        userDiv.className = "admin-user";

        const userHistory = histories[user.username] || [];

        userDiv.innerHTML = `
            <h3>👤 ${user.username} (${user.role})</h3>
            <p>Total History: ${userHistory.length}</p>

            <button onclick="deleteUser('${user.username}')">Hapus User</button>
            <button onclick="clearUserHistory('${user.username}')">Clear History</button>

            <details>
                <summary>Lihat History</summary>
                ${renderUserHistory(userHistory)}
            </details>

            <hr>
        `;

        container.appendChild(userDiv);
    });
}

// ===============================
// RENDER HISTORY
// ===============================
function renderUserHistory(historyList) {
    if (!historyList || historyList.length === 0) {
        return "<p>Tidak ada history</p>";
    }

    return historyList.map(item => `
        <div style="margin-bottom:10px;">
            <p><b>Text:</b> ${item.text}</p>
            ${item.result ? `<p><b>Result:</b> ${item.result}</p>` : ""}
            <small>${item.date}</small>
        </div>
    `).join("");
}

// ===============================
// DELETE USER (API)
// ===============================
async function deleteUser(username) {
    if (username === "admin") {
        alert("Admin tidak bisa dihapus!");
        return;
    }

    if (!confirm(`Hapus user ${username}?`)) return;

    try {
        const res = await fetch("/api/admin/delete-user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username })
        });

        const data = await res.json();
        alert(data.message);

        renderAdminPanel();

    } catch {
        alert("Gagal hapus user!");
    }
}

// ===============================
// CLEAR HISTORY USER (API)
// ===============================
async function clearUserHistory(username) {
    if (!confirm(`Hapus semua history ${username}?`)) return;

    try {
        const res = await fetch("/api/admin/clear-history", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username })
        });

        const data = await res.json();
        alert(data.message);

        renderAdminPanel();

    } catch {
        alert("Gagal hapus history!");
    }
}

// ===============================
// INIT ADMIN
// ===============================
window.addEventListener("load", () => {
    if (isAdmin()) {
        console.log("Login sebagai ADMIN");

        setTimeout(() => {
            renderAdminPanel();
        }, 300);
    }
});