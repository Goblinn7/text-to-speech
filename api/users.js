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
                password: 0 // sembunyikan password
            }).toArray();

            return res.status(200).json(allUsers);
        }

        // ==========================
        // DELETE USER
        // ==========================
        if (method === "DELETE") {

            const { username } = req.body;

            if (!username) {
                return res.status(400).json({ error: "Username wajib" });
            }

            // Jangan hapus admin
            if (username === "admin") {
                return res.status(403).json({ error: "Admin tidak bisa dihapus" });
            }

            await users.deleteOne({ username });

            return res.status(200).json({ message: "User berhasil dihapus" });
        }

        // ==========================
        // UPDATE ROLE (OPTIONAL)
        // ==========================
        if (method === "PUT") {

            const { username, role } = req.body;

            if (!username || !role) {
                return res.status(400).json({ error: "Data tidak lengkap" });
            }

            await users.updateOne(
                { username },
                { $set: { role } }
            );

            return res.status(200).json({ message: "Role berhasil diupdate" });
        }

        // ==========================
        // METHOD NOT ALLOWED
        // ==========================
        return res.status(405).json({ error: "Method tidak diizinkan" });

    } catch (error) {
        console.error("USERS API ERROR:", error);
        return res.status(500).json({ error: "Server error" });
    }
}