const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const outputText = document.getElementById('outputText');
const timingStats = document.getElementById('timing');
const charCountStats = document.getElementById('charCount');
const modeSelect = document.getElementById('mode');

const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { result, time } = e.data;
    outputText.textContent = result;
    timingStats.textContent = `Time: ${time.toFixed(2)}ms`;
    charCountStats.textContent = `Chars: ${result.length}`;
    processBtn.disabled = false;
    processBtn.textContent = 'Clean Whitespace';
};

processBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text) return;

    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';

    worker.postMessage({
        text,
        mode: modeSelect.value
    });
});
