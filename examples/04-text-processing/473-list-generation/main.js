const inputText = document.getElementById('inputText');
const typeSelect = document.getElementById('type');
const sortSelect = document.getElementById('sort');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const timeStats = document.getElementById('timeStats');
const countStats = document.getElementById('countStats');

const worker = new Worker('worker.js');

convertBtn.addEventListener('click', () => {
    const text = inputText.value.trim();
    if (!text) return;

    convertBtn.disabled = true;
    convertBtn.textContent = 'Processing...';

    const start = performance.now();

    worker.postMessage({
        text,
        type: typeSelect.value,
        sort: sortSelect.value
    });

    worker.onmessage = (e) => {
        const end = performance.now();
        const { result, count } = e.data;

        outputText.textContent = result;
        timeStats.textContent = `${(end - start).toFixed(2)}ms`;
        countStats.textContent = count;

        convertBtn.disabled = false;
        convertBtn.textContent = 'Generate List';
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
inputText.value = `Apples
Oranges
Bananas
Grapes`;
