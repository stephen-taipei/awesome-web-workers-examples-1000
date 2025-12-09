const inputText = document.getElementById('inputText');
const localeSelect = document.getElementById('locale');
const numericSelect = document.getElementById('numeric');
const sortBtn = document.getElementById('sortBtn');
const clearBtn = document.getElementById('clearBtn');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const timeStats = document.getElementById('timeStats');
const countStats = document.getElementById('countStats');

const worker = new Worker('worker.js');

sortBtn.addEventListener('click', () => {
    const text = inputText.value.trim();
    if (!text) return;

    sortBtn.disabled = true;
    sortBtn.textContent = 'Sorting...';

    const start = performance.now();

    worker.postMessage({
        text,
        locale: localeSelect.value,
        numeric: numericSelect.value === 'true'
    });

    worker.onmessage = (e) => {
        const end = performance.now();
        const { result, count } = e.data;

        outputText.textContent = result;
        timeStats.textContent = `${(end - start).toFixed(2)}ms`;
        countStats.textContent = count;

        sortBtn.disabled = false;
        sortBtn.textContent = 'Sort List';
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

inputText.value = `Zebra
Äpfel
10 Bananas
2 Apples
Öl
Åre
Cote
Côte
100
20`;
