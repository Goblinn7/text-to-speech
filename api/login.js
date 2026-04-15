import { MongoClient } from 'mongodb';

// Gunakan process.env agar password tidak terlihat di GitHub
const uri = process.env.MONGODB_URI;

// Inisialisasi client di luar handler agar koneksi bisa dipakai ulang (re-use)
// Ini teknik optimasi di Vercel/Serverless
let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(uri);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    // 1. Keamanan: Hanya izinkan metode POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const client = await connectToDatabase();
        const database = client.db('tts_web'); 
        const users = database.collection('users');

        const { username, password } = req.body;

        // 2. Validasi Input Dasar
        if (!username || !password) {
            return res.status(400).json({ error: "Username dan password wajib diisi" });
        }

        // 3. Cari user di MongoDB
        const user = await users.findOne({ username, password });

        if (user) {
            // Login Berhasil
            return res.status(200).json({
                user: {
                    username: user.username,
                    role: user.role
                },
                message: "Login berhasil!"
            });
        } else {
            // Kredensial Salah
            return res.status(401).json({ error: "Username atau Password salah!" });
        }

    } catch (error) {
        console.error("Database Error:", error);
        return res.status(500).json({ error: "Terjadi kesalahan pada server" });
    }
    // Note: Di serverless, kita tidak menutup koneksi secara paksa (client.close) 
    // agar request berikutnya bisa lebih cepat (warm start).
}