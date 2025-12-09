const inputText = document.getElementById('inputText');
const formatSelect = document.getElementById('format');
const formatBtn = document.getElementById('formatBtn');
const clearBtn = document.getElementById('clearBtn');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const timeStats = document.getElementById('timeStats');
const countStats = document.getElementById('countStats');

const worker = new Worker('worker.js');

formatBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text.trim()) return;

    formatBtn.disabled = true;
    formatBtn.textContent = 'Formatting...';

    const start = performance.now();

    worker.postMessage({
        text,
        format: formatSelect.value
    });

    worker.onmessage = (e) => {
        const end = performance.now();
        const { result, count } = e.data;

        outputText.textContent = result;
        timeStats.textContent = `${(end - start).toFixed(2)}ms`;
        countStats.textContent = count;

        formatBtn.disabled = false;
        formatBtn.textContent = 'Format Numbers';
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
inputText.value = `1234567890
(123) 456-7890
123-456-7890
+1 123 456 7890`;
