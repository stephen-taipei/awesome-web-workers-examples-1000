const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const outputArea = document.getElementById('outputArea');
const processTimeDisplay = document.getElementById('processTime');

let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, taggedWords, duration } = e.data;

        if (type === 'result') {
            renderResult(taggedWords);
            processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;
            processBtn.disabled = false;
            processBtn.textContent = '開始標註';
        }
    };

    worker.onerror = function(error) {
        console.error('Worker error:', error);
        alert('標註過程中發生錯誤');
        processBtn.disabled = false;
        processBtn.textContent = '開始標註';
    };
}

function renderResult(taggedWords) {
    outputArea.innerHTML = taggedWords.map(item => `
        <div class="tagged-word">
            <span class="word-text">${item.word}</span>
            <span class="pos-tag">${item.tag}</span>
        </div>
    `).join('');
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
