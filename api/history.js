import { MongoClient, ObjectId } from "mongodb";

// ==============================
// CONFIG MONGODB
// ==============================
const uri = process.env.MONGODB_URI; 
const client = new MongoClient(uri);

let db;

// ==============================
// CONNECT DB (CACHE BIAR CEPAT)
// ==============================
async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db("tts_web"); 
    }
    return db;
}

// ==============================
// HANDLER
// ==============================
export default async function handler(req, res) {
    const { method } = req;

    try {
        const database = await connectDB();
        const collection = database.collection("histories");

        // ==========================
        // 1. ADD HISTORY (POST) - DENGAN PROTEKSI DUPLIKAT
        // ==========================
        if (method === "POST") {
            const { username, text, result } = req.body;

            if (!username || !text) {
                return res.status(400).json({ error: "Data tidak lengkap" });
            }

            // --- PROTEKSI DUPLIKAT (CEK DATA TERAKHIR) ---
            const lastEntry = await collection.findOne(
                { username: username }, 
                { sort: { date: -1 } }
            );

            // Jika teks dan hasil sama persis dengan yang terakhir, jangan simpan lagi
            if (lastEntry && lastEntry.text === text && lastEntry.result === result) {
                return res.status(200).json({ message: "Data duplikat terdeteksi, skip penyimpanan" });
            }

            await collection.insertOne({
                username,
                text,
                result,
                date: new Date() 
            });

            return res.status(200).json({ message: "History tersimpan" });
        }

        // ==========================
        // 2. GET HISTORY (GET) - SEKARANG MENDUKUNG ADMIN
        // ==========================
        if (method === "GET") {
            const { user, admin } = req.query; 

            // --- LOGIKA BARU UNTUK ADMIN ---
            // Jika request mengandung parameter admin=true, berikan SEMUA history
            if (admin === "true") {
                const allHistories = await collection
                    .find({}) // Tanpa filter username
                    .sort({ date: -1 })
                    .toArray();
                return res.status(200).json(allHistories);
            }

            // --- LOGIKA UNTUK USER BIASA ---
            if (!user) {
                return res.status(400).json({ error: "Username dibutuhkan" });
            }

            const histories = await collection
                .find({ username: user })
                .sort({ date: -1 })
                .toArray();

            return res.status(200).json(histories);
        }

        // ==========================
        // 3. DELETE HISTORY (DELETE)
        // ==========================
        if (method === "DELETE") {
            const { id, user } = req.query;

            // Hapus Satu Item berdasarkan ID
            if (id) {
                await collection.deleteOne({ _id: new ObjectId(id) });
                return res.status(200).json({ message: "Item dihapus" });
            }

            // Hapus Semua Item berdasarkan User
            if (user) {
                await collection.deleteMany({ username: user });
                return res.status(200).json({ message: "Semua history user dihapus" });
            }

            return res.status(400).json({ error: "ID atau User dibutuhkan" });
        }

        // ==========================
        // METHOD NOT ALLOWED
        // ==========================
        res.setHeader("Allow", ["GET", "POST", "DELETE"]);
        return res.status(405).json({ error: `Method ${method} tidak diizinkan` });

    } catch (error) {
        console.error("DATABASE ERROR:", error);
        return res.status(500).json({ error: "Gagal terhubung ke database" });
    }
}