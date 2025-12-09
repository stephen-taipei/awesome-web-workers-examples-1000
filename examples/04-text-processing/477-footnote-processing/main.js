const inputText = document.getElementById('inputText');
const actionSelect = document.getElementById('action');
const processBtn = document.getElementById('processBtn');
const clearBtn = document.getElementById('clearBtn');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const timeStats = document.getElementById('timeStats');
const countStats = document.getElementById('countStats');

const worker = new Worker('worker.js');

processBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text.trim()) return;

    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';

    const start = performance.now();

    worker.postMessage({
        text,
        action: actionSelect.value
    });

    worker.onmessage = (e) => {
        const end = performance.now();
        const { result, count } = e.data;

        outputText.textContent = result;
        timeStats.textContent = `${(end - start).toFixed(2)}ms`;
        countStats.textContent = count;

        processBtn.disabled = false;
        processBtn.textContent = 'Process';
    };
});

clearBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.textContent = '';
    timeStats.textContent = '-';
    countStats.textContent = '-';
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(outputText.textContent).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
});

// Load sample data
inputText.value = `Here is a statement.[^1] And another fact.[^note]

[^1]: Source A
[^note]: Source B`;
