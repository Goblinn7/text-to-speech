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
        // Sam, ini diarahkan ke /api/users sesuai dengan file users.js di folder api kamu
        const res = await fetch("/api/users");
        const data = await res.json();
        return data.users || data; // Mendukung format array langsung atau objek {users: []}
    } catch (err) {
        console.error("Fetch Users Error:", err);
        return [];
    }
}

async function fetchHistories() {
    try {
        // Diarahkan ke /api/history sesuai file history.js di folder api kamu
        const res = await fetch("/api/history");
        const data = await res.json();
        return data.histories || {};
    } catch (err) {
        console.error("Fetch Histories Error:", err);
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

    container.innerHTML = "<h2>Admin Dashboard</h2><p>Loading data...</p>";

    const users = await fetchUsers();
    const histories = await fetchHistories();

    container.innerHTML = "<h2>Admin Dashboard</h2>";

    if (!users || users.length === 0) {
        container.innerHTML += "<p>Tidak ada user terdaftar.</p>";
        return;
    }

    // Menggunakan loop asli kamu agar tidak ada fungsi yang hilang
    users.forEach((user, index) => {
        // Melewati render untuk user 'admin' agar tidak sengaja terhapus
        if (user.username === "admin") return;

        const userDiv = document.createElement("div");
        userDiv.className = "admin-user";
        userDiv.style.background = "#2c2c2c";
        userDiv.style.padding = "15px";
        userDiv.style.marginBottom = "15px";
        userDiv.style.borderRadius = "10px";
        userDiv.style.borderLeft = "5px solid #ffcc00";

        const userHistory = histories[user.username] || [];

        userDiv.innerHTML = `
            <h3 style="margin-top:0;">👤 ${user.username} (${user.role})</h3>
            <p>Total History: <b>${userHistory.length}</b></p>

            <div style="margin-bottom: 10px; display: flex; gap: 10px;">
                <button onclick="deleteUser('${user.username}')" style="background:#ff4d4d; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">Hapus User</button>
                <button onclick="clearUserHistory('${user.username}')" style="background:#555; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">Clear History</button>
            </div>

            <details style="background:#1e1e1e; padding:10px; border-radius:5px;">
                <summary style="cursor:pointer; color:#ffcc00;">Lihat History Lengkap</summary>
                <div style="margin-top:10px; max-height: 250px; overflow-y: auto;">
                    ${renderUserHistory(userHistory)}
                </div>
            </details>

            <hr style="border:0; border-top:1px solid #444; margin-top:15px;">
        `;

        container.appendChild(userDiv);
    });
}

// ===============================
// RENDER HISTORY
// ===============================
function renderUserHistory(historyList) {
    if (!historyList || historyList.length === 0) {
        return "<p style='color:#888; font-style:italic;'>Tidak ada history aktivitas.</p>";
    }

    return historyList.map(item => `
        <div style="margin-bottom:12px; border-bottom:1px solid #333; padding-bottom:8px;">
            <p style="margin:0; font-size:14px;"><b>Text:</b> ${item.text}</p>
            ${item.result ? `<p style="margin:5px 0 0 0; font-size:14px; color:#4db8ff;"><b>Result:</b> ${item.result}</p>` : ""}
            <small style="color:#777;">${item.date || 'Tanggal tidak tersedia'}</small>
        </div>
    `).join("");
}

// ===============================
// DELETE USER (API)
// ===============================
async function deleteUser(username) {
    if (username === "admin") {
        alert("Akses Ditolak: User admin utama tidak bisa dihapus!");
        return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus user "${username}" secara permanen?`)) return;

    try {
        // Menggunakan endpoint /api/users dengan method DELETE agar sesuai standar CRUD
        const res = await fetch("/api/users", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username })
        });

        const data = await res.json();
        
        if (res.ok) {
            alert(data.message || "User berhasil dihapus.");
            renderAdminPanel();
        } else {
            alert("Error: " + data.message);
        }

    } catch (err) {
        console.error(err);
        alert("Gagal menghubungi server untuk hapus user!");
    }
}

// ===============================
// CLEAR HISTORY USER (API)
// ===============================
async function clearUserHistory(username) {
    if (!confirm(`Hapus seluruh riwayat aktivitas untuk user "${username}"?`)) return;

    try {
        // Menggunakan endpoint /api/history dengan method DELETE
        const res = await fetch("/api/history", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                username: username,
                action: "clear_user_history" // Flag tambahan jika diperlukan di backend
            })
        });

        const data = await res.json();
        
        if (res.ok) {
            alert(data.message || "History user telah dibersihkan.");
            renderAdminPanel();
        } else {
            alert("Error: " + data.message);
        }

    } catch (err) {
        console.error(err);
        alert("Gagal menghubungi server untuk hapus history!");
    }
}

// ===============================
// INIT ADMIN
// ===============================
window.addEventListener("load", () => {
    if (isAdmin()) {
        console.log("Sistem Admin Aktif: Login sebagai ADMIN");

        // Delay sedikit agar elemen DOM adminContainer siap
        setTimeout(() => {
            renderAdminPanel();
        }, 500);
    }
});