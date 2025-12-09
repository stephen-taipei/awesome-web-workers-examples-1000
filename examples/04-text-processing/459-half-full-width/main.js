const conversionModeInput = document.getElementById('conversionMode');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const resultContainer = document.getElementById('resultContainer');
const processingTimeDisplay = document.getElementById('processingTime');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, convertedText, time } = e.data;

        if (type === 'result') {
            outputText.value = convertedText;
            processingTimeDisplay.textContent = `${time.toFixed(2)}ms`;
            resultContainer.classList.remove('hidden');
            processBtn.disabled = false;
        }
    };
}

initWorker();

processBtn.addEventListener('click', () => {
    const text = inputText.value;
    const mode = conversionModeInput.value;

    if (!text) return;

    processBtn.disabled = true;

    worker.postMessage({
        text: text,
        mode: mode
    });
});

resetBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.value = '';
    resultContainer.classList.add('hidden');
});
