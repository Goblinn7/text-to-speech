export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { text } = req.body || {};

        if (!text) {
            return res.status(200).json({ corrected: "" });
        }

        const API_KEY = process.env.API_KEY;

        if (!API_KEY) {
            return res.status(500).json({
                error: "API_KEY belum diset di Vercel"
            });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Fix grammar only. Return ONLY the corrected sentence without explanation:\n${text}`
                                }
                            ]
                        }
                    ]
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Gemini Error:", errorText);

            return res.status(500).json({
                error: "Failed to process AI request"
            });
        }

        const data = await response.json();

        let corrected =
            data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        corrected = corrected
            .replace(/^\s*Sure.*?:/i, "")
            .replace(/\n/g, " ")
            .trim();

        return res.status(200).json({ corrected });

    } catch (error) {
        console.error("API ERROR:", error);

        return res.status(500).json({
            error: "Internal Server Error"
        });
    }
}
