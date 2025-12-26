const inputText = document.getElementById('inputText');
const styleSelect = document.getElementById('style');
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
        style: styleSelect.value
    });

    worker.onmessage = (e) => {
        const end = performance.now();
        const { result, count, error } = e.data;

        if (error) {
            outputText.textContent = `Error: ${error}`;
            countStats.textContent = '0';
        } else {
            outputText.textContent = result;
            countStats.textContent = count;
        }
        timeStats.textContent = `${(end - start).toFixed(2)}ms`;

        formatBtn.disabled = false;
        formatBtn.textContent = 'Format Citations';
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
inputText.value = `[
  {
    "type": "book",
    "author": "Smith, John",
    "title": "The Art of Coding",
    "year": 2023,
    "publisher": "Tech Press"
  },
  {
    "type": "journal",
    "author": "Doe, Jane and Wilson, Sam",
    "title": "Web Workers in Depth",
    "journal": "Journal of Web Performance",
    "year": 2022,
    "volume": "10",
    "issue": "2",
    "pages": "100-115"
  }
]`;
