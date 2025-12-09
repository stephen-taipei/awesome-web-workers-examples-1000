const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const outputArea = document.getElementById('outputArea');
const timeTaken = document.getElementById('timeTaken');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, paragraphs, time } = e.data;
        if (type === 'result') {
            outputArea.innerHTML = paragraphs.map((p, i) =>
                `<div class="paragraph-box">
                    <span class="paragraph-meta">段落 ${i+1} (長度: ${p.length} 字)</span>
                    ${escapeHtml(p)}
                 </div>`
            ).join('');
            timeTaken.textContent = `(共 ${paragraphs.length} 段, 耗時: ${time.toFixed(2)}ms)`;
            processBtn.disabled = false;
            processBtn.textContent = '分割段落';
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
        .replace(/'/g, "&#039;")
        .replace(/\n/g, "<br>");
}

processBtn.addEventListener('click', process);
initWorker();
