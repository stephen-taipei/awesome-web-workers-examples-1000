const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const processBtn = document.getElementById('processBtn');
const sortTypeSelect = document.getElementById('sortType');
const processTimeDisplay = document.getElementById('processTime');

let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, result, duration } = e.data;

        if (type === 'result') {
            outputText.value = result;
            processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;
            processBtn.disabled = false;
            processBtn.textContent = '開始排序';
        }
    };

    worker.onerror = function(error) {
        console.error('Worker error:', error);
        alert('處理過程中發生錯誤');
        processBtn.disabled = false;
        processBtn.textContent = '開始排序';
    };
}

processBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text) return;

    processBtn.disabled = true;
    processBtn.textContent = '排序中...';
    outputText.value = '';

    initWorker();

    worker.postMessage({
        text: text,
        sortType: sortTypeSelect.value
    });
});
