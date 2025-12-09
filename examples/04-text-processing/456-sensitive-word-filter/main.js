const sensitiveWordsInput = document.getElementById('sensitiveWords');
const inputText = document.getElementById('inputText');
const replacementInput = document.getElementById('replacement');
const outputText = document.getElementById('outputText');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const resultContainer = document.getElementById('resultContainer');
const processingTimeDisplay = document.getElementById('processingTime');
const matchCountDisplay = document.getElementById('matchCount');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, filteredText, matchCount, time } = e.data;

        if (type === 'result') {
            outputText.value = filteredText;
            processingTimeDisplay.textContent = `${time.toFixed(2)}ms`;
            matchCountDisplay.textContent = matchCount;
            resultContainer.classList.remove('hidden');
            processBtn.disabled = false;
        }
    };
}

initWorker();

processBtn.addEventListener('click', () => {
    const text = inputText.value;
    const words = sensitiveWordsInput.value.split(',').map(w => w.trim()).filter(w => w.length > 0);
    const replacement = replacementInput.value || '*';

    if (!text) return;

    processBtn.disabled = true;

    worker.postMessage({
        text: text,
        words: words,
        replacement: replacement
    });
});

resetBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.value = '';
    resultContainer.classList.add('hidden');
});
