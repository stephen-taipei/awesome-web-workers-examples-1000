const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const outputArea = document.getElementById('outputArea');
const processTimeDisplay = document.getElementById('processTime');
const wordCountDisplay = document.getElementById('wordCount');
const algorithmSelect = document.getElementById('algorithm');

let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, words, duration } = e.data;

        if (type === 'result') {
            renderResult(words);
            processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;
            wordCountDisplay.textContent = words.length;
            processBtn.disabled = false;
            processBtn.textContent = '開始分詞';
        }
    };

    worker.onerror = function(error) {
        console.error('Worker error:', error);
        alert('分詞過程中發生錯誤');
        processBtn.disabled = false;
        processBtn.textContent = '開始分詞';
    };
}

function renderResult(words) {
    outputArea.innerHTML = words.map(word => `<span class="word">${word}</span>`).join('');
}

processBtn.addEventListener('click', () => {
    const text = inputText.value.trim();
    if (!text) return;

    processBtn.disabled = true;
    processBtn.textContent = '處理中...';
    outputArea.innerHTML = '';

    initWorker();

    worker.postMessage({
        text: text,
        algorithm: algorithmSelect.value
    });
});
