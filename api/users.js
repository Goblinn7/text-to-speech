import { MongoClient } from "mongodb";

// ==============================
// CONFIG MONGODB
// ==============================
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;

// ==============================
// CONNECT DB (CACHE)
// ==============================
async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db("tts_web");
    }
    return db;
}

// ==============================
// USERS HANDLER (ADMIN ONLY)
// ==============================
export default async function handler(req, res) {
    try {
        const database = await connectDB();
        const users = database.collection("users");
        const { method } = req;

        // ==========================
        // GET ALL USERS
        // ==========================
        if (method === "GET") {
            const allUsers = await users.find({}).project({
                password: 0 // sembunyikan password demi keamanan
            }).toArray();

            return res.status(200).json(allUsers);
        }

        // ==========================
        // DELETE USER
        // ==========================
        if (method === "DELETE") {
            // Sam, di admin.js kamu kirim via ?username=..., jadi ambil dari req.query
            const { username } = req.query;

            if (!username) {
                return res.status(400).json({ message: "Username wajib diisi" });
            }

            // Keamanan tambahan: Jangan hapus admin
            if (username === "admin") {
                return res.status(403).json({ message: "Akses Ditolak: Admin tidak bisa dihapus" });
            }

            const result = await users.deleteOne({ username });

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: "User tidak ditemukan di database" });
            }

            return res.status(200).json({ message: `User ${username} berhasil dihapus secara permanen` });
        }

        // ==========================
        // UPDATE ROLE (PUT)
        // ==========================
        if (method === "PUT") {
            const { username, role } = req.body;

            if (!username || !role) {
                return res.status(400).json({ message: "Data tidak lengkap" });
            }

            await users.updateOne(
                { username },
                { $set: { role } }
            );

            return res.status(200).json({ message: "Role berhasil diperbarui" });
        }

        // ==========================
        // METHOD NOT ALLOWED
        // ==========================
        return res.status(405).json({ message: "Method tidak diizinkan" });

    } catch (error) {
        console.error("USERS API ERROR:", error);
        return res.status(500).json({ message: "Terjadi kesalahan pada server (Server Error)" });
    }
}