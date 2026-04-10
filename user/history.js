// ===============================
// HISTORY SYSTEM (API VERSION)
// ===============================

/**
 * Mendapatkan username dari localStorage
 */
function getCurrentUser() {
    return localStorage.getItem("currentUser");
}

/**
 * TAMBAH HISTORY
 * Digunakan saat user klik translate, play audio, atau generate poster
 */
async function saveHistory(text, result = "") {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const res = await fetch("/api/history", {
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

        if (res.ok) {
            renderHistory();
        }
    } catch (err) {
        console.error("Gagal simpan history:", err);
    }
}

/**
 * TAMPILKAN HISTORY
 * Mengambil data dari MongoDB via API Vercel
 */
async function renderHistory() {
    const user = getCurrentUser();
    const container = document.getElementById("historyContainer");

    if (!container) return;
    
    if (!user) {
        container.innerHTML = "<p style='opacity:0.6'>Silahkan login untuk melihat history</p>";
        return;
    }

    try {
        // Tampilkan loading sebentar
        container.innerHTML = "<p style='opacity:0.6'>Memuat data...</p>";

        const res = await fetch(`/api/history?user=${user}`);
        
        if (!res.ok) throw new Error("Gagal mengambil data");
        
        const data = await res.json();

        container.innerHTML = "";

        if (!data || data.length === 0) {
            container.innerHTML = "<p style='opacity:0.6'>Belum ada riwayat aktivitas</p>";
            return;
        }

        // Urutkan dari yang terbaru (reverse)
        data.reverse().forEach((item) => {
            const div = document.createElement("div");
            div.className = "history-item";
            
            // Format tampilan item history
            div.innerHTML = `
                <div style="margin-bottom: 10px; border-bottom: 1px dashed #444; padding-bottom: 10px;">
                    <p style="margin: 5px 0;"><b>Input:</b> ${item.text}</p>
                    ${item.result ? `<p style="margin: 5px 0; color: #00ffd5;"><b>Hasil:</b> ${item.result}</p>` : ""}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <small style="opacity: 0.5;">${new Date(item.date).toLocaleString('id-ID')}</small>
                        <button class="btn-delete-small" onclick="deleteHistory('${item._id}')" 
                                style="background: #ff4d4d; color: white; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                            Hapus
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(div);
        });

    } catch (err) {
        console.error("Gagal load history:", err);
        container.innerHTML = "<p style='color: #ff4d4d;'>Gagal memuat history. Pastikan koneksi database aktif.</p>";
    }
}

/**
 * HAPUS SATU HISTORY
 * Menghapus dokumen berdasarkan ID unik MongoDB
 */
async function deleteHistory(id) {
    if (!confirm("Hapus catatan ini dari riwayat?")) return;

    try {
        const res = await fetch(`/api/history?id=${id}`, {
            method: "DELETE"
        });

        if (res.ok) {
            renderHistory();
        } else {
            alert("Gagal menghapus item.");
        }
    } catch (err) {
        console.error("Gagal hapus:", err);
        alert("Terjadi kesalahan saat menghubungi server.");
    }
}

/**
 * HAPUS SEMUA HISTORY (BULK DELETE)
 * Menghapus semua history milik user yang sedang login
 */
async function clearHistory() {
    const user = getCurrentUser();
    if (!user) return;

    if (!confirm("Peringatan: Semua riwayat akan dihapus secara permanen. Lanjutkan?")) return;

    try {
        const res = await fetch(`/api/history?user=${user}`, {
            method: "DELETE"
        });

        if (res.ok) {
            renderHistory();
        } else {
            alert("Gagal membersihkan history.");
        }
    } catch (err) {
        console.error("Gagal clear:", err);
        alert("Terjadi kesalahan saat menghapus semua data.");
    }
}

/**
 * AUTO LOAD
 * Menjalankan render saat halaman selesai dimuat
 */
window.addEventListener("DOMContentLoaded", () => {
    // Beri sedikit jeda agar element container siap
    setTimeout(renderHistory, 300);
});