const inputText = document.getElementById('inputText');
const styleSelect = document.getElementById('style');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const timeStats = document.getElementById('timeStats');
const nodeStats = document.getElementById('nodeStats');
const depthStats = document.getElementById('depthStats');

const worker = new Worker('worker.js');

convertBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text.trim()) return;

    convertBtn.disabled = true;
    convertBtn.textContent = 'Processing...';

    const start = performance.now();

    worker.postMessage({
        text,
        style: styleSelect.value
    });

    worker.onmessage = (e) => {
        const end = performance.now();
        const { result, nodes, maxDepth } = e.data;

        outputText.textContent = result;
        timeStats.textContent = `${(end - start).toFixed(2)}ms`;
        nodeStats.textContent = nodes;
        depthStats.textContent = maxDepth;

        convertBtn.disabled = false;
        convertBtn.textContent = 'Generate Tree';
    };
});

clearBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.textContent = '';
    timeStats.textContent = '-';
    nodeStats.textContent = '-';
    depthStats.textContent = '-';
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(outputText.textContent).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
});

// Load sample data
inputText.value = `Project
  src
    index.js
    components
      Button.js
      Header.js
  package.json`;
