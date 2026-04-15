document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // INIT & DOM SELECTION
    // ==========================================
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

    // Flag untuk mencegah double save ke database
    let isSaving = false;

    // ==========================================
    // SAFE HISTORY (API VERSION)
    // ==========================================
    async function safeSaveHistory(text, result="") {
        
        if (isSaving) return; 
        
        const user = localStorage.getItem("currentUser");
        if (!user) return;

        isSaving = true; 

        try {
            const res = await fetch("/api/history", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ username: user, text, result })
            });

            if (res.ok) {
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
            isSaving = false; 
        }
    }

    // ==========================================
    // SAFETY CHECK ELEMENT
    // ==========================================
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

    // ==========================================
    // BACKGROUND THEMES (SIDOARJO HERITAGE)
    // ==========================================
    const themeBackgrounds = {
        sunset: "images/jayandaru.png",
        ocean: "images/candi_sumur.png",
        dark: "images/candi_dermo.png",
        nature: "images/candi_pari.png"
    };

    // ==========================================
    // LANGUAGE SWAP LOGIC
    // ==========================================
    swapBtn?.addEventListener("click", () => {
        [fromLangSelect.value, toLangSelect.value] =
        [toLangSelect.value, fromLangSelect.value];
    });

    // ==========================================
    // LANGUAGE DETECT (UPDATED FOR INDO PHRASES)
    // ==========================================
    function detectLanguage(text){
        const indonesianWords = [
            "saya","nama","kamu","dia","makan","minum","ini","itu",
            "rumah","sekolah","belajar","halo","tuhan","percaya","rencana",
            "terbaik","untukku","adalah","yang","dengan","milik"
        ];
        
        const lower = text.toLowerCase();
        
        for(let word of indonesianWords){
            if(lower.includes(word)) return "id";
        }
        return "en";
    }

    // ==========================================
    // SPEECH SYNTHESIS: LOAD VOICES
    // ==========================================
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

    // ==========================================
    // LISTEN BUTTON: PLAY AUDIO
    // ==========================================
    listenBtn?.addEventListener("click", () => {
        if(!textarea) return;
        const text = textarea.value.trim();
        if (!text) return;

        window.speechSynthesis.cancel();
        speech.text = text;
        window.speechSynthesis.speak(speech);

        safeSaveHistory(text, "🔊 Played Audio");
    });

    // ==========================================
    // TRANSLATE FEATURE (MYMEMORY API)
    // ==========================================
    translateBtn?.addEventListener("click", async () => {
        if(!textarea || !translationResult) return;
        const text = textarea.value.trim();
        if (!text) {
            alert("Please write text first!");
            return;
        }

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

        translationResult.innerHTML = "Translating...";
        let fromLang = fromLangSelect.value;
        let toLang = toLangSelect.value;

        if(fromLang === "auto") fromLang = detectLanguage(text);
        if(fromLang === toLang) toLang = (fromLang === "en") ? "id" : "en";

        try {
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
        } catch (err) {
            translationResult.innerHTML = "❌ Translation failed";
            console.error(err);
        }
    });

    // ==========================================
    // AUTO GRAMMAR CHECK (LANGUAGETOOL API)
    // ==========================================
    textarea?.addEventListener("input", () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            checkGrammarLT(textarea.value);
        }, delay);
    });

    async function checkGrammarLT(text) {
        if (!text.trim()) {
            if(previewBox) previewBox.style.display = "none";
            return;
        }

        if (detectLanguage(text) === "id") {
            if(previewBox) previewBox.style.display = "none";
            return;
        }

        const manualFixes = [
            { reg: /\bi\b/g, rep: "I" },
            { reg: /\bi'm\b/gi, rep: "I'm" },
            { reg: /\bi've\b/gi, rep: "I've" },
            { reg: /\bi a\b/gi, rep: "is a" },
            { reg: /\bhallo\b/gi, rep: "hello" },
            { reg: /\bgod morning\b/gi, rep: "good morning" },
            { reg: /\bgod afternoon\b/gi, rep: "good afternoon" },
            { reg: /\bgod evening\b/gi, rep: "good evening" },
            { reg: /\bgod night\b/gi, rep: "good night" },
            { reg: /\bgod luck\b/gi, rep: "good luck" },
            { reg: /\bI go to (.+) yesterday\b/gi, rep: "I went to $1 yesterday" },
            { reg: /\bI did not saw\b/gi, rep: "I did not see" },
            { reg: /\bmy friend don't\b/gi, rep: "my friend doesn't" },
            { reg: /\bshe buy\b/gi, rep: "she buys" },
            { reg: /\bi going\b/gi, rep: "I am going" },
            { reg: /\bi eating\b/gi, rep: "I am eating" },
            { reg: /\bi working\b/gi, rep: "I am working" }
        ];

        let processedText = text;
        manualFixes.forEach(fix => {
            processedText = processedText.replace(fix.reg, fix.rep);
        });

        const localWhitelist = ["candi", "jayandaru", "sidoarjo", "pari", "sumur", "dermo", "samudra", "umsida"];
        const isLikelyProperName = processedText.trim().split(/\s+/).length <= 2;

        if (isLikelyProperName || !previewBox || !loading) {
            if(previewBox && processedText === text) previewBox.style.display = "none";
            if(previewBox && processedText !== text) showCorrection(processedText);
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

                    if ((start > 0 && /^[A-Z]/.test(originalWord)) || localWhitelist.includes(originalWord.toLowerCase())) {
                        return;
                    }

                    if (match.replacements.length > 0) {
                        const replacement = match.replacements[0].value;
                        correctedText = correctedText.substring(0, start) + replacement + correctedText.substring(end);
                    }
                });
                showCorrection(correctedText);
            } else {
                if (processedText !== text) {
                    showCorrection(processedText);
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

    function showCorrection(finalText) {
        if (finalText === textarea.value) {
            previewBox.style.display = "none";
            return;
        }
        previewBox.style.display = "block";
        previewBox.innerHTML = `
            ✨ AI Correction:
            <span style="color:#00ffd5;font-weight:bold;cursor:pointer;">
                ${finalText}
            </span>
        `;
        previewBox.onclick = () => {
            textarea.value = finalText;
            previewBox.style.display = "none";
            if(canvas.style.display === "block") drawPoster(finalText);
        };
    }

    // ==========================================
    // POSTER ENGINE: DRAW ON CANVAS
    // ==========================================
    function drawPoster(text) {
        return new Promise((resolve) => {
            if(!canvas) return;
            const ctx = canvas.getContext("2d");
            
            canvas.width = 800;
            canvas.height = 1000;
            
            const img = new Image();
            img.crossOrigin = "anonymous"; // Penting agar tidak Tainted Canvas saat download
            
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = "rgba(0,0,0,0.5)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.textAlign = "center";
                ctx.fillStyle = "white";
                ctx.font = "bold 42px Arial";
                
                ctx.fillStyle = "white";
                ctx.font = "28px Arial";
                wrapText(ctx, text, canvas.width / 2, 200, 700, 40);

                if (translatedText) {
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

    // ==========================================
    // ACTION: GENERATE POSTER
    // ==========================================
    window.generatePoster = async function () {
        if(!textarea || !canvas) return;
        const text = textarea.value.trim();
        if (!text) return alert("Please write text first!");
        
        canvas.style.display = "block";
        await drawPoster(text);
        
        if(downloadBtn) {
            downloadBtn.style.display = "inline-block";
        }
        
        window.speechSynthesis.cancel();
        speech.text = text;
        window.speechSynthesis.speak(speech);
        
        safeSaveHistory(text, translatedText || "Poster Generated");
    };

    // ==========================================
    // ACTION: DOWNLOAD POSTER (FIXED & LINKED)
    // ==========================================
    window.downloadPoster = function() {
        try {
            if (canvas.style.display === "none") {
                alert("Please generate the poster first!");
                return;
            }
            const dataURL = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'Poster-Sidoarjo-TTS.png';
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Download Error:", err);
            alert("Failed to download image. Make sure images are loaded correctly.");
        }
    };

    // Binding event click ke tombol download jika ada di HTML
    downloadBtn?.addEventListener("click", () => {
        window.downloadPoster();
    });

});