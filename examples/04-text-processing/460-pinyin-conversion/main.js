const inputText = document.getElementById('inputText');
const toneMarksInput = document.getElementById('toneMarks');
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
        const { type, pinyinText, time } = e.data;

        if (type === 'result') {
            outputText.value = pinyinText;
            processingTimeDisplay.textContent = `${time.toFixed(2)}ms`;
            resultContainer.classList.remove('hidden');
            processBtn.disabled = false;
        }
    };
}

initWorker();

processBtn.addEventListener('click', () => {
    const text = inputText.value;

    if (!text) return;

    processBtn.disabled = true;

    worker.postMessage({
        text: text,
        withTones: toneMarksInput.checked
    });
});

resetBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.value = '';
    resultContainer.classList.add('hidden');
});
