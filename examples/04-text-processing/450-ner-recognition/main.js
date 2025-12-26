const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const outputArea = document.getElementById('outputArea');
const processTimeDisplay = document.getElementById('processTime');
const entityCountDisplay = document.getElementById('entityCount');

let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, html, count, duration } = e.data;

        if (type === 'result') {
            outputArea.innerHTML = html;
            processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;
            entityCountDisplay.textContent = count;
            processBtn.disabled = false;
            processBtn.textContent = '開始識別';
        }
    };

    worker.onerror = function(error) {
        console.error('Worker error:', error);
        alert('識別過程中發生錯誤');
        processBtn.disabled = false;
        processBtn.textContent = '開始識別';
    };
}

processBtn.addEventListener('click', () => {
    const text = inputText.value.trim();
    if (!text) return;

    processBtn.disabled = true;
    processBtn.textContent = '處理中...';
    outputArea.innerHTML = '';

    initWorker();

    worker.postMessage({ text: text });
});
