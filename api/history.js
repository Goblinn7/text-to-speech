import { MongoClient } from "mongodb";

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
        db = client.db("tts_app"); // nama database bebas
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
        // ADD HISTORY
        // ==========================
        if (method === "POST") {
            const { username, text, result } = req.body;

            if (!username || !text) {
                return res.status(400).json({ error: "Data tidak lengkap" });
            }

            await collection.insertOne({
                username,
                text,
                result,
                createdAt: new Date()
            });

            return res.status(200).json({ message: "History tersimpan" });
        }

        // ==========================
        // GET HISTORY PER USER
        // ==========================
        if (method === "GET") {
            const { username } = req.query;

            if (!username) {
                return res.status(400).json({ error: "Username dibutuhkan" });
            }

            const histories = await collection
                .find({ username })
                .sort({ createdAt: -1 })
                .toArray();

            return res.status(200).json(histories);
        }

        // ==========================
        // DELETE ALL HISTORY USER
        // ==========================
        if (method === "DELETE") {
            const { username } = req.body;

            await collection.deleteMany({ username });

            return res.status(200).json({ message: "History dihapus" });
        }

        // ==========================
        // METHOD NOT ALLOWED
        // ==========================
        return res.status(405).json({ error: "Method tidak diizinkan" });

    } catch (error) {
        console.error("ERROR:", error);
        return res.status(500).json({ error: "Server error" });
    }
}