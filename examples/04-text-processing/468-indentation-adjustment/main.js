const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const outputText = document.getElementById('outputText');
const timingStats = document.getElementById('timing');
const lineCountStats = document.getElementById('lineCount');
const modeSelect = document.getElementById('mode');
const indentCharSelect = document.getElementById('indentChar');
const amountInput = document.getElementById('amount');

const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { result, time, lineCount } = e.data;
    outputText.textContent = result;
    timingStats.textContent = `Time: ${time.toFixed(2)}ms`;
    lineCountStats.textContent = `Lines: ${lineCount}`;
    processBtn.disabled = false;
    processBtn.textContent = 'Adjust Indent';
};

processBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text) return;

    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';

    worker.postMessage({
        text,
        mode: modeSelect.value,
        indentType: indentCharSelect.value,
        amount: parseInt(amountInput.value, 10)
    });
});
