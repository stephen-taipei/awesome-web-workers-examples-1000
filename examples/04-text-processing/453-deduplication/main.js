const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const processBtn = document.getElementById('processBtn');
const ignoreCaseCb = document.getElementById('ignoreCase');
const trimWhitespaceCb = document.getElementById('trimWhitespace');
const origCountDisplay = document.getElementById('origCount');
const resultCountDisplay = document.getElementById('resultCount');
const processTimeDisplay = document.getElementById('processTime');

let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, result, originalCount, newCount, duration } = e.data;

        if (type === 'result') {
            outputText.value = result;
            origCountDisplay.textContent = originalCount;
            resultCountDisplay.textContent = newCount;
            processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;
            processBtn.disabled = false;
            processBtn.textContent = '去除重複';
        }
    };

    worker.onerror = function(error) {
        console.error('Worker error:', error);
        alert('處理過程中發生錯誤');
        processBtn.disabled = false;
        processBtn.textContent = '去除重複';
    };
}

processBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text) return;

    processBtn.disabled = true;
    processBtn.textContent = '處理中...';
    outputText.value = '';

    initWorker();

    worker.postMessage({
        text: text,
        ignoreCase: ignoreCaseCb.checked,
        trimWhitespace: trimWhitespaceCb.checked
    });
});
