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
        db = client.db("tts_app");
    }
    return db;
}

// ==============================
// REGISTER HANDLER
// ==============================
export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method tidak diizinkan" });
    }

    try {
        const database = await connectDB();
        const users = database.collection("users");

        const { username, password } = req.body;

        // ==========================
        // VALIDASI INPUT
        // ==========================
        if (!username || !password) {
            return res.status(400).json({ error: "Username & password wajib" });
        }

        // ==========================
        // CEK USER SUDAH ADA
        // ==========================
        const existingUser = await users.findOne({ username });

        if (existingUser) {
            return res.status(400).json({ error: "Username sudah digunakan" });
        }

        // ==========================
        // SET ROLE DEFAULT
        // ==========================
        const role = "user";

        // ==========================
        // SIMPAN USER
        // ==========================
        await users.insertOne({
            username,
            password,
            role,
            createdAt: new Date()
        });

        return res.status(201).json({
            message: "Register berhasil",
            user: {
                username,
                role
            }
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);
        return res.status(500).json({ error: "Server error" });
    }
}