const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const outputArea = document.getElementById('outputArea');
const timeTaken = document.getElementById('timeTaken');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, sentences, time } = e.data;
        if (type === 'result') {
            outputArea.innerHTML = sentences.map((s, i) =>
                `<span class="segment" title="句子 ${i+1}">${escapeHtml(s)}</span>`
            ).join(' ');
            timeTaken.textContent = `(共 ${sentences.length} 句, 耗時: ${time.toFixed(2)}ms)`;
            processBtn.disabled = false;
            processBtn.textContent = '分割句子';
        }
    };
}

function process() {
    const text = inputText.value;
    if (!text.trim()) return;

    processBtn.disabled = true;
    processBtn.textContent = '處理中...';

    if (!worker) initWorker();
    worker.postMessage({ text });
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

processBtn.addEventListener('click', process);
initWorker();
