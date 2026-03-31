export default async function handler(req, res) {
    // Tambahkan header CORS agar bisa dipanggil dari frontend mana saja
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Tangani preflight request dari browser
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { text } = req.body || {};

        if (!text) {
            return res.status(200).json({ corrected: "" });
        }

        // Pastikan API_KEY ini sudah kamu input di Dashboard Vercel!
        const API_KEY = process.env.API_KEY;

        if (!API_KEY) {
            return res.status(500).json({
                error: "API_KEY belum diset di Dashboard Vercel"
            });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Fix grammar only. Return ONLY the corrected sentence without explanation:\n${text}`
                        }]
                    }]
                })
            }
        );

        const data = await response.json();

        // Cek jika ada error dari Google Gemini-nya
        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        let corrected = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Pembersihan teks agar tidak ada kalimat tambahan dari AI
        corrected = corrected
            .replace(/^\s*Sure.*?:/i, "")
            .replace(/\n/g, " ")
            .trim();

        return res.status(200).json({ corrected });

    } catch (error) {
        console.error("API ERROR:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
