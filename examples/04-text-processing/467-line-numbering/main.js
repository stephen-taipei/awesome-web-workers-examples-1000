const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const outputText = document.getElementById('outputText');
const timingStats = document.getElementById('timing');
const lineCountStats = document.getElementById('lineCount');
const startNumInput = document.getElementById('startNum');
const padWidthInput = document.getElementById('padWidth');
const separatorInput = document.getElementById('separator');

const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { result, time, lineCount } = e.data;
    outputText.textContent = result;
    timingStats.textContent = `Time: ${time.toFixed(2)}ms`;
    lineCountStats.textContent = `Lines: ${lineCount}`;
    processBtn.disabled = false;
    processBtn.textContent = 'Add Line Numbers';
};

processBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text) return;

    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';

    worker.postMessage({
        text,
        startNum: parseInt(startNumInput.value, 10),
        padWidth: parseInt(padWidthInput.value, 10),
        separator: separatorInput.value
    });
});
