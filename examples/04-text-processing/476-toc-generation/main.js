const inputText = document.getElementById('inputText');
const formatSelect = document.getElementById('format');
const depthSelect = document.getElementById('depth');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const timeStats = document.getElementById('timeStats');
const linkStats = document.getElementById('linkStats');

const worker = new Worker('worker.js');

generateBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text.trim()) return;

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    const start = performance.now();

    worker.postMessage({
        text,
        format: formatSelect.value,
        maxDepth: parseInt(depthSelect.value)
    });

    worker.onmessage = (e) => {
        const end = performance.now();
        const { result, count } = e.data;

        outputText.textContent = result;
        timeStats.textContent = `${(end - start).toFixed(2)}ms`;
        linkStats.textContent = count;

        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate TOC';
    };
});

clearBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.textContent = '';
    timeStats.textContent = '-';
    linkStats.textContent = '-';
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(outputText.textContent).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
});

// Load sample data
inputText.value = `# Introduction
## Setup
### Installation
## Usage
# Conclusion`;
