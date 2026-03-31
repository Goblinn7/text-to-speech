document.addEventListener("DOMContentLoaded", () => {

    // ==========================
    // 1. INITIALIZATION
    // ==========================
    const speech = new SpeechSynthesisUtterance();
    let voices = [];

    const voiceSelect = document.getElementById("voiceSelect");
    const textarea = document.getElementById("inputText");
    const previewBox = document.getElementById("correctionPreview");
    const listenBtn = document.getElementById("listenBtn");
    const canvas = document.getElementById("posterCanvas");
    const translateBtn = document.getElementById("translateBtn");
    const translationResult = document.getElementById("translationResult");
    const fromLangSelect = document.getElementById("fromLang");
    const toLangSelect = document.getElementById("toLang");
    const swapBtn = document.getElementById("swapLang");
    const posterTheme = document.getElementById("posterTheme");
    const loading = document.getElementById("loading");

    let translatedText = ""; 
    let typingTimer;
    const delay = 800;
    let controller;

    const themeBackgrounds = {
        sunset: "images/jayandaru.png",
        ocean: "images/candi_sumur.png",
        dark: "images/candi_dermo.png",
        nature: "images/candi_pari.png"
    };

    // ==========================
    // 2. LANGUAGE LOGIC
    // ==========================
    swapBtn?.addEventListener("click", () => {
        const temp = fromLangSelect.value;
        fromLangSelect.value = toLangSelect.value;
        toLangSelect.value = temp;
    });

    function detectLanguage(text) {
        const indonesianWords = ["saya","nama","kamu","dia","makan","minum","halo","ini","adalah","di"];
        const lower = text.toLowerCase();
        return indonesianWords.some(word => lower.includes(word)) ? "id" : "en";
    }

    // ==========================
    // 3. SPEECH ENGINE
    // ==========================
    const loadVoices = () => {
        voices = window.speechSynthesis.getVoices();
        if(!voiceSelect) return;
        voiceSelect.innerHTML = voices
            .map((voice, i) => `<option value="${i}">${voice.name} (${voice.lang})</option>`)
            .join("");
        if (voices.length > 0) speech.voice = voices[0];
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    voiceSelect?.addEventListener("change", () => {
        speech.voice = voices[voiceSelect.value];
    });

    listenBtn?.addEventListener("click", () => {
        const text = textarea?.value.trim();
        if (!text) return;
        window.speechSynthesis.cancel();
        speech.text = text;
        window.speechSynthesis.speak(speech);
    });

    // ==========================
    // 4. TRANSLATE ENGINE
    // ==========================
    translateBtn?.addEventListener("click", async () => {
        if(!textarea || !translationResult) return;
        const text = textarea.value.trim();
        if (!text) return;

        translationResult.innerHTML = "⌛ Translating...";

        let from = fromLangSelect.value;
        let to = toLangSelect.value;

        if(from === "auto") from = detectLanguage(text);
        if(from === to) to = (from === "en") ? "id" : "en";

        try {
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
            const data = await res.json();
            
            translatedText = data?.responseData?.translatedText || "Translation error";

            translationResult.innerHTML = `
                <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin-top: 10px;">
                    <small>Detected: ${from.toUpperCase()}</small><br>
                    <strong>${translatedText}</strong>
                </div>
            `;
        } catch (error) {
            translationResult.innerHTML = "❌ Translation failed";
        }
    });

    // ==========================
    // 5. GRAMMAR AI (FIXED PATH & VARIABLE)
    // ==========================
    textarea?.addEventListener("input", () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            checkGrammarPreview(textarea.value);
        }, delay);
    });

    async function checkGrammarPreview(text) {
        if (!text.trim() || text.length < 5) {
            if(previewBox) previewBox.style.display = "none";
            return;
        }

        if (controller) controller.abort();
        controller = new AbortController();
        if(loading) loading.style.display = "block";

        try {
            // PERBAIKAN: Menggunakan path relatif 'api/grammar' agar lebih aman di Vercel
            const response = await fetch('api/grammar', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
                signal: controller.signal
            });

            if (!response.ok) throw new Error("API Server Error");

            const data = await response.json();
            // PERBAIKAN: Nama properti harus 'correction' sesuai file grammar.js
            const correctedText = data.correction;

            if(loading) loading.style.display = "none";

            if (!correctedText || correctedText.toLowerCase().trim() === text.toLowerCase().trim()) {
                previewBox.style.display = "none";
                return;
            }

            previewBox.style.display = "block";
            previewBox.innerHTML = `✨ AI Correction: <span style="color:#00ffd5;font-weight:bold;cursor:pointer;text-decoration:underline;">${correctedText}</span>`;

            previewBox.onclick = () => {
                textarea.value = correctedText;
                previewBox.style.display = "none";
                translateBtn.click(); // Langsung translate ulang setelah dikoreksi
            };

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error("Grammar error:", error);
                if(loading) loading.style.display = "none";
            }
        }
    }

    // ==========================
    // 6. POSTER ENGINE
    // ==========================
    async function drawPoster(text) {
        if(!canvas) return;
        const ctx = canvas.getContext("2d");
        
        const img = new Image();
        img.src = themeBackgrounds[posterTheme?.value] || themeBackgrounds.sunset;

        return new Promise((resolve) => {
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Overlay Gelap
                ctx.fillStyle = "rgba(0,0,0,0.6)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.textAlign = "center";
                ctx.fillStyle = "white";
                ctx.font = "bold 40px Arial";
                ctx.fillText("English Learning Card", canvas.width / 2, 100);

                // Original Text
                ctx.fillStyle = "#00ffd5";
                ctx.font = "bold 28px Arial";
                ctx.fillText("Original Text", canvas.width / 2, 220);
                ctx.fillStyle = "white";
                ctx.font = "32px Arial";
                wrapText(ctx, text, canvas.width / 2, 280, 700, 45);

                // Translated Text
                if (translatedText) {
                    ctx.fillStyle = "#ff0055";
                    ctx.font = "bold 28px Arial";
                    ctx.fillText("Translation", canvas.width / 2, 550);
                    ctx.fillStyle = "white";
                    ctx.font = "32px Arial";
                    wrapText(ctx, translatedText, canvas.width / 2, 610, 700, 45);
                }

                resolve();
            };
        });
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(" ");
        let line = "";
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " ";
            if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + " ";
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    }

    window.generatePoster = async function () {
        const text = textarea?.value.trim();
        if (!text) return alert("Write something first!");
        
        if(!translatedText) {
            await translateBtn.click();
            // Beri jeda sebentar agar fetch selesai
            setTimeout(async () => {
                canvas.style.display = "block";
                await drawPoster(text);
                listenBtn.click();
            }, 1000);
        } else {
            canvas.style.display = "block";
            await drawPoster(text);
            listenBtn.click();
        }
    };
});
