document.addEventListener("DOMContentLoaded", () => {

    // ==========================
    // INIT
    // ==========================
    const speech = new SpeechSynthesisUtterance();
    let voices = [];

    const voiceSelect = document.getElementById("voiceSelect");
    const textarea = document.getElementById("inputText");
    const previewBox = document.getElementById("correctionPreview");
    const listenBtn = document.getElementById("listenBtn");
    const canvas = document.getElementById("posterCanvas");
    const downloadBtn = document.getElementById("downloadBtn"); 

    const translateBtn = document.getElementById("translateBtn");
    const translationResult = document.getElementById("translationResult");

    const fromLangSelect = document.getElementById("fromLang");
    const toLangSelect = document.getElementById("toLang");
    const swapBtn = document.getElementById("swapLang");

    const posterTheme = document.getElementById("posterTheme");
    const loading = document.getElementById("loading");

    let translatedText = ""; 
    let detectedLang = "";

    let typingTimer;
    const delay = 800;
    let controller;

    // Tambahkan flag untuk mencegah double save tanpa merusak struktur baris lain
    let isSaving = false;

    // ==========================
    // SAFE HISTORY (API VERSION)
    // ==========================
    async function safeSaveHistory(text, result="") {
        if (isSaving) return; // Kunci jika sedang proses menyimpan
        
        const user = localStorage.getItem("currentUser");
        if (!user) return;

        isSaving = true; // Set kunci aktif

        try {
            // Mengarahkan ke endpoint API yang benar
            const res = await fetch("/api/history", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ username: user, text, result })
            });

            if (res.ok) {
                // Memanggil fungsi renderHistory jika ada di file lain (misal di history.js)
                // agar list history di UI langsung ter-update
                if (typeof renderHistory === "function") {
                    renderHistory();
                }
            } else {
                throw new Error("Gagal menyimpan ke server");
            }

        } catch (err) {
            console.warn("API Error, mencoba fallback ke LocalStorage:", err);
            if (typeof saveHistory === "function") {
                saveHistory(text, result);
            }
        } finally {
            isSaving = false; // Buka kunci setelah selesai (berhasil/gagal)
        }
    }

    // ==========================
    // SAFETY CHECK
    // ==========================
    function safe(el, name){
        if(!el){
            console.error(`❌ Element #${name} tidak ditemukan`);
        }
        return el;
    }

    safe(voiceSelect,"voiceSelect");
    safe(textarea,"inputText");
    safe(listenBtn,"listenBtn");
    safe(downloadBtn,"downloadBtn");

    // ==========================
    // BACKGROUND THEMES
    // ==========================
    const themeBackgrounds = {
        sunset: "images/jayandaru.png",
        ocean: "images/candi_sumur.png",
        dark: "images/candi_dermo.png",
        nature: "images/candi_pari.png"
    };

    // ==========================
    // LANGUAGE SWAP
    // ==========================
    swapBtn?.addEventListener("click", () => {
        [fromLangSelect.value, toLangSelect.value] =
        [toLangSelect.value, fromLangSelect.value];
    });

    // ==========================
    // SIMPLE LANGUAGE DETECT
    // ==========================
    function detectLanguage(text){
        const indonesianWords = [
            "saya","nama","kamu","dia","makan","minum",
            "rumah","sekolah","belajar","halo"
        ];
        const lower = text.toLowerCase();
        for(let word of indonesianWords){
            if(lower.includes(word)) return "id";
        }
        return "en";
    }

    // ==========================
    // LOAD VOICES
    // ==========================
    window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();

        if(!voiceSelect) return;

        voiceSelect.innerHTML = "";

        voices.forEach((voice, i) => {
            const option = new Option(`${voice.name} (${voice.lang})`, i);
            voiceSelect.appendChild(option);
        });

        if (voices.length > 0) speech.voice = voices[0];
    };

    voiceSelect?.addEventListener("change", () => {
        speech.voice = voices[voiceSelect.value];
    });

    // ==========================
    // PLAY AUDIO
    // ==========================
    listenBtn?.addEventListener("click", () => {
        if(!textarea) return;

        const text = textarea.value.trim();
        if (!text) return;

        window.speechSynthesis.cancel();
        speech.text = text;
        window.speechSynthesis.speak(speech);

        safeSaveHistory(text, "🔊 Played Audio");
    });

    // ==========================
    // TRANSLATE FEATURE
    // ==========================
    translateBtn?.addEventListener("click", async () => {

        if(!textarea || !translationResult) return;

        const text = textarea.value.trim();
        if (!text) {
            alert("Please write text first!");
            return;
        }

        // --- FILTER KHUSUS KALIMAT SINGKAT ---
        const shortPhrases = {
            "good morning": "Selamat pagi",
            "good afternoon": "Selamat siang",
            "good evening": "Selamat malam",
            "how are you": "Apa kabar?",
            "thank you": "Terima kasih"
        };

        const lowerText = text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
        
        if (shortPhrases[lowerText]) {
            translatedText = shortPhrases[lowerText];
            translationResult.innerHTML = `
                🌍 Detected: <b>EN (Manual Filter)</b><br>
                🌍 Translation: <b>${translatedText}</b>
            `;
            safeSaveHistory(text, translatedText);
            return; 
        }
        // --------------------------------------

        translationResult.innerHTML = "Translating...";

        let fromLang = fromLangSelect.value;
        let toLang = toLangSelect.value;

        if(fromLang === "auto") fromLang = detectLanguage(text);
        if(fromLang === toLang) toLang = (fromLang === "en") ? "id" : "en";

        try {
            // Optimasi MyMemory: Menggunakan de=email dan format yang lebih stabil
            const response = await fetch(
                "https://api.mymemory.translated.net/get?q=" +
                encodeURIComponent(text) +
                "&langpair=" + fromLang + "|" + toLang +
                "&de=samudra.dicky@student.umsida.ac.id"
            );

            const data = await response.json();

            translatedText = data?.responseData?.translatedText || "Translation not available";

            translationResult.innerHTML = `
                🌍 Detected: <b>${fromLang.toUpperCase()}</b><br>
                🌍 Translation: <b>${translatedText}</b>
            `;

            safeSaveHistory(text, translatedText);

        } catch {
            translationResult.innerHTML = "❌ Translation failed";
        }
    });

    // ==========================
    // AUTO GRAMMAR CHECK
    // ==========================
    textarea?.addEventListener("input", () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            checkGrammarLT(textarea.value);
        }, delay);
    });

    async function checkGrammarLT(text) {
        // --- LOGIKA BARU: CONTEXTUAL TYPO FIXER (GOD vs GOOD) ---
        const typoContexts = {
            "god morning": "good morning",
            "god afternoon": "good afternoon",
            "god evening": "good evening",
            "god night": "good night",
            "god luck": "good luck"
        };

        let processedText = text;
        const lowerInput = text.toLowerCase();

        // Cek apakah ada kesalahan konteks sapaan
        for (const [wrong, right] of Object.entries(typoContexts)) {
            if (lowerInput.includes(wrong)) {
                processedText = text.replace(new RegExp(wrong, 'gi'), right);
            }
        }

        // Logika Filter: Daftar kata aman agar tidak dirusak AI (Sidoarjo Pride)
        const localWhitelist = ["jayandaru", "sidoarjo", "pari", "sumur", "dermo", "samudra", "umsida"];
        const hasLocalWord = localWhitelist.some(word => processedText.toLowerCase().includes(word));
        
        // Logika Filter Dosen: Jangan koreksi jika input hanya 1-3 kata (Indikasi nama objek wisata)
        const isLikelyProperName = processedText.trim().split(/\s+/).length <= 3;

        // Jika mengandung kata lokal ATAU teks pendek, langsung sembunyikan koreksi
        if (!processedText.trim() || isLikelyProperName || hasLocalWord || !previewBox || !loading) {
            if(previewBox) previewBox.style.display = "none";
            return;
        }

        if (controller) controller.abort();
        controller = new AbortController();

        loading.style.display = "block";

        try {
            const response = await fetch("https://api.languagetool.org/v2/check", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    text: processedText,
                    language: "en-US"
                }),
                signal: controller.signal
            });

            const data = await response.json();

            loading.style.display = "none";

            if (data.matches && data.matches.length > 0) {

                let correctedText = processedText;
                const matches = [...data.matches].reverse();

                matches.forEach(match => {
                    const start = match.offset;
                    const end = match.offset + match.length;
                    const originalWord = processedText.substring(start, end);

                    // Filter tambahan: Jika kata diawali huruf Kapital (Proper Noun) atau ada di whitelist, lewati
                    if (/^[A-Z]/.test(originalWord) || localWhitelist.includes(originalWord.toLowerCase())) return;

                    if (match.replacements.length > 0) {
                        const replacement = match.replacements[0].value;

                        correctedText =
                            correctedText.substring(0, start) +
                            replacement +
                            correctedText.substring(end);
                    }
                });

                if (correctedText === text) {
                    previewBox.style.display = "none";
                    return;
                }

                previewBox.style.display = "block";
                previewBox.innerHTML = `
                    ✨ AI Correction:
                    <span style="color:#00ffd5;font-weight:bold;cursor:pointer;">
                        ${correctedText}
                    </span>
                `;

                previewBox.onclick = () => {
                    textarea.value = correctedText;
                    previewBox.style.display = "none";

                    if(canvas.style.display === "block") {
                        drawPoster(correctedText);
                    }
                };

            } else {
                // Kasus khusus: Jika API tidak menemukan error tapi filter lokal kita menemukan "god" -> "good"
                if (processedText !== text) {
                    previewBox.style.display = "block";
                    previewBox.innerHTML = `✨ AI Correction: <span style="color:#00ffd5;font-weight:bold;cursor:pointer;">${processedText}</span>`;
                    previewBox.onclick = () => {
                        textarea.value = processedText;
                        previewBox.style.display = "none";
                    };
                } else {
                    previewBox.style.display = "none";
                }
            }

        } catch (error) {
            if (error.name === 'AbortError') return;

            loading.style.display = "none";
            if(previewBox) previewBox.style.display = "none";
        }
    }

    // ==========================
    // DRAW POSTER
    // ==========================
    function drawPoster(text) {
        return new Promise((resolve) => {

            if(!canvas) return;

            const ctx = canvas.getContext("2d");

            canvas.width = 800;
            canvas.height = 1000;

            const img = new Image();

            img.onload = () => {

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                ctx.fillStyle = "rgba(0,0,0,0.5)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.textAlign = "center";

                ctx.fillStyle = "white";
                ctx.font = "bold 42px Arial";
                ctx.fillText("English Learning Mode", canvas.width / 2, 80);

                ctx.fillStyle = "#cccccc";
                ctx.font = "bold 24px Arial";
                ctx.fillText("Original", canvas.width / 2, 160);

                ctx.fillStyle = "white";
                ctx.font = "28px Arial";
                wrapText(ctx, text, canvas.width / 2, 200, 700, 40);

                if (translatedText) {
                    ctx.fillStyle = "#cccccc";
                    ctx.fillText("Translation", canvas.width / 2, 450);

                    ctx.fillStyle = "#E0E0E0";
                    wrapText(ctx, translatedText, canvas.width / 2, 500, 700, 40);
                }

                resolve();
            };

            img.src = themeBackgrounds[posterTheme.value];
        });
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(" ");
        let line = "";

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " ";
            const testWidth = ctx.measureText(testLine).width;

            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + " ";
                y += lineHeight;
            } else {
                line = testLine;
            }
        }

        ctx.fillText(line, x, y);
    }

    // ==========================
    // GENERATE POSTER
    // ==========================
    window.generatePoster = async function () {

        if(!textarea || !canvas) return;

        const text = textarea.value.trim();

        if (!text) return alert("Please write text first!");

        canvas.style.display = "block";

        await drawPoster(text);

        downloadBtn.style.display = "inline-block";

        window.speechSynthesis.cancel();
        speech.text = text;
        window.speechSynthesis.speak(speech);

        // Memanggil fungsi save history satu kali saja
        safeSaveHistory(text, translatedText || "Poster Generated");
    };

    // ==========================
    // DOWNLOAD
    // ==========================
    window.downloadPoster = function() {
        const link = document.createElement('a');
        link.download = 'Poster-Sidoarjo-TTS.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

});