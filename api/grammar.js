export default async function handler(req, res) {
    // 1. Header CORS agar bisa dipanggil dari domain mana saja (penting untuk Vercel)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 2. Tangani Preflight Request (biasanya dikirim browser sebelum POST)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. Hanya izinkan metode POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { text } = req.body || {};

        // Jika teks kosong, kembalikan string kosong tanpa memanggil AI (hemat kuota)
        if (!text || text.trim() === "") {
            return res.status(200).json({ corrected: "" });
        }

        // Ambil API_KEY dari Environment Variables Vercel
        const API_KEY = process.env.API_KEY;

        if (!API_KEY) {
            console.error("Missing API_KEY in Environment Variables");
            return res.status(500).json({
                error: "API_KEY belum diset di Dashboard Vercel"
            });
        }

        // 4. Request ke Google Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Fix grammar only. Return ONLY the corrected sentence without explanation or conversational fillers like "Sure". If the sentence is already correct, return it as is:\n${text}`
                        }]
                    }]
                })
            }
        );

        // Cek jika fetch gagal (bukan karena kodingan, tapi masalah koneksi/API)
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            return res.status(response.status).json({ error: errorData.error?.message || "Gemini API failure" });
        }

        const data = await response.json();

        // 5. Ambil hasil koreksi dengan aman
        let corrected = data?.candidates?.[0]?.content?.parts?.[0]?.text || text;

        // Pembersihan karakter aneh atau "Sure, here is..." yang kadang masih muncul
        corrected = corrected
            .replace(/^(Sure|Here is the corrected sentence):/i, "")
            .replace(/["`]/g, "") // Hapus tanda petik jika AI iseng menambahkannya
            .replace(/\n/g, " ")
            .trim();

        // Kirim hasil ke frontend
        return res.status(200).json({ corrected });

    } catch (error) {
        // Log error di dashboard Vercel agar kita bisa telusuri
        console.error("SERVER SIDE ERROR:", error);
        
        // Fallback: Jika ada error, kembalikan teks asli agar web tidak menampilkan "Error"
        return res.status(500).json({ 
            error: "Internal Server Error",
            details: error.message 
        });
    }
}
