const inputText = document.getElementById('inputText');
const delimiterSelect = document.getElementById('delimiter');
const formatSelect = document.getElementById('format');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const timeStats = document.getElementById('timeStats');
const rowStats = document.getElementById('rowStats');
const colStats = document.getElementById('colStats');

const worker = new Worker('worker.js');

convertBtn.addEventListener('click', () => {
    const text = inputText.value.trim();
    if (!text) return;

    convertBtn.disabled = true;
    convertBtn.textContent = 'Processing...';
    outputText.textContent = 'Generating...';

    const start = performance.now();

    worker.postMessage({
        text,
        delimiter: delimiterSelect.value,
        format: formatSelect.value
    });

    worker.onmessage = (e) => {
        const end = performance.now();
        const { result, rows, cols } = e.data;

        outputText.textContent = result;
        timeStats.textContent = `${(end - start).toFixed(2)}ms`;
        rowStats.textContent = rows;
        colStats.textContent = cols;

        convertBtn.disabled = false;
        convertBtn.textContent = 'Convert Table';
    };
});

clearBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.textContent = '';
    timeStats.textContent = '-';
    rowStats.textContent = '-';
    colStats.textContent = '-';
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(outputText.textContent).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
});

// Load sample data
inputText.value = `ID,Name,Department,Salary
101,John Doe,Engineering,$85000
102,Jane Smith,Marketing,$72000
103,Sam Wilson,Sales,$68000
104,Lisa Wong,HR,$75000`;
