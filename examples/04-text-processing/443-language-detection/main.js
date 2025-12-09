const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const detectedLangEl = document.getElementById('detectedLang');
const confidenceEl = document.getElementById('confidence');
const detailsEl = document.getElementById('details');
const timeTaken = document.getElementById('timeTaken');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, result, time } = e.data;
        if (type === 'result') {
            const top = result[0];
            detectedLangEl.textContent = getLangName(top.lang);
            confidenceEl.textContent = `Confidence Score: ${top.score.toFixed(4)}`;

            // Show top 3
            detailsEl.innerHTML = result.slice(0, 5).map(r =>
                `<div>${getLangName(r.lang)} (${r.lang}): ${r.score.toFixed(4)}</div>`
            ).join('');

            timeTaken.textContent = `(耗時: ${time.toFixed(2)}ms)`;
            processBtn.disabled = false;
            processBtn.textContent = '檢測語言';
        }
    };
}

function process() {
    const text = inputText.value;
    if (!text.trim()) return;

    processBtn.disabled = true;
    processBtn.textContent = '檢測中...';

    if (!worker) initWorker();
    worker.postMessage({ text });
}

function getLangName(code) {
    const names = {
        'en': 'English',
        'fr': 'French',
        'de': 'German',
        'es': 'Spanish',
        'it': 'Italian',
        'nl': 'Dutch',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic'
    };
    return names[code] || code.toUpperCase();
}

window.loadText = function(lang) {
    const texts = {
        'en': "Web Workers makes it possible to run a script operation in a background thread separate from the main execution thread of a web application.",
        'es': "Los Web Workers hacen posible ejecutar una operación de script en un hilo en segundo plano separado del hilo de ejecución principal.",
        'fr': "Les Web Workers permettent d'exécuter une opération de script dans un thread d'arrière-plan séparé du thread d'exécution principal.",
        'de': "Web Workers ermöglichen es, eine Skriptoperation in einem Hintergrund-Thread getrennt vom Hauptausführungs-Thread auszuführen.",
        'zh': "Web Worker 使得在獨立於 Web 應用程序主執行緒的背景執行緒中運行腳本操作成為可能。",
        'ja': "Web Worker は、Web アプリケーションのメイン実行スレッドとは別のバックグラウンドスレッドでスクリプト操作を実行することを可能にします。"
    };
    inputText.value = texts[lang];
};

processBtn.addEventListener('click', process);
initWorker();
