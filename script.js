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

    // ==========================
    // SAFETY CHECK (ANTI ERROR)
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
            if(lower.includes(word)){
                return "id";
            }
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

        if (voices.length > 0) {
            speech.voice = voices[0];
        }
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

        translationResult.innerHTML = "Translating...";

        let fromLang = fromLangSelect.value;
        let toLang = toLangSelect.value;

        if(fromLang === "auto"){
            fromLang = detectLanguage(text);
            detectedLang = fromLang;
        }

        if(fromLang === toLang){
            toLang = (fromLang === "en") ? "id" : "en";
        }

        try {
            const response = await fetch(
                "https://api.mymemory.translated.net/get?q=" +
                encodeURIComponent(text) +
                "&langpair=" + fromLang + "|" + toLang
            );

            const data = await response.json();

            translatedText = data?.responseData?.translatedText || "Translation not available";

            translationResult.innerHTML = `
            🌍 Detected: <b>${fromLang.toUpperCase()}</b><br>
            🌍 Translation: <b>${translatedText}</b>
            `;

        } catch (error) {
            translationResult.innerHTML = "❌ Translation failed";
        }
    });

    // ==========================
    // AUTO GRAMMAR CHECK
    // ==========================
    textarea?.addEventListener("input", () => {

        clearTimeout(typingTimer);

        typingTimer = setTimeout(() => {
            checkGrammarPreview(textarea.value);
        }, delay);

    });

    async function checkGrammarPreview(text) {

        if (!text.trim() || !previewBox || !loading) return;

        if (controller) controller.abort();
        controller = new AbortController();

        loading.style.display = "block";

        try {

            const response = await fetch("/api/grammar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ text }),
                signal: controller.signal
            });

            const data = await response.json();
            const correctedText = data.corrected;

            loading.style.display = "none";

            if (!correctedText || correctedText === text) {
                previewBox.style.display = "none";
                return;
            }

            previewBox.style.display = "block";

            previewBox.innerHTML = `
            ✨ AI Correction:
            <span style="color:#00ffd5;font-weight:bold;">
            ${correctedText}
            </span>
            `;

            previewBox.onclick = () => {
                textarea.value = correctedText;
                previewBox.style.display = "none";
            };

        } catch (error) {
            loading.style.display = "none";
            previewBox.style.display = "none";
            console.error("Grammar error:", error);
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

            img.onerror = () => {
                alert("❌ Gambar background tidak ditemukan!");
            };

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
                    ctx.font = "bold 24px Arial";
                    ctx.fillText("Translation / Terjemahan", canvas.width / 2, 450);

                    ctx.fillStyle = "#E0E0E0";
                    ctx.font = "28px Arial";

                    wrapText(ctx, translatedText, canvas.width / 2, 500, 700, 40);
                }

                resolve();
            };

            img.src = themeBackgrounds[posterTheme?.value];
        });
    }

    // ==========================
    // TEXT WRAP
    // ==========================
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

        if (!text)
            return alert("Please write text first!");

        canvas.style.display = "block";

        await drawPoster(text);

        window.speechSynthesis.cancel();
        speech.text = text;
        window.speechSynthesis.speak(speech);
    };

});