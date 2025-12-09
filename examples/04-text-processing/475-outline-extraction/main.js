const inputText = document.getElementById('inputText');
const formatSelect = document.getElementById('format');
const extractBtn = document.getElementById('extractBtn');
const clearBtn = document.getElementById('clearBtn');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const timeStats = document.getElementById('timeStats');
const countStats = document.getElementById('countStats');

const worker = new Worker('worker.js');

extractBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text.trim()) return;

    extractBtn.disabled = true;
    extractBtn.textContent = 'Extracting...';

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

        extractBtn.disabled = false;
        extractBtn.textContent = 'Extract Outline';
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
inputText.value = `# Title
## Section 1
Content...
## Section 2
### Subsection 2.1
Content...`;
