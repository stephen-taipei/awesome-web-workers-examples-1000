const inputText = document.getElementById('inputText');
const convertBtn = document.getElementById('convertBtn');
const outputText = document.getElementById('outputText');
const timingStats = document.getElementById('timing');
const charCountStats = document.getElementById('charCount');

const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { result, time } = e.data;
    outputText.textContent = result;
    timingStats.textContent = `Time: ${time.toFixed(2)}ms`;
    charCountStats.textContent = `Chars: ${result.length}`;
    convertBtn.disabled = false;
    convertBtn.textContent = 'Convert to Title Case';
};

convertBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text) return;

    convertBtn.disabled = true;
    convertBtn.textContent = 'Processing...';
    worker.postMessage({ text });
});
