const inputText = document.getElementById('inputText');
const speedSelect = document.getElementById('speed');
const pitchSelect = document.getElementById('pitch');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const outputText = document.getElementById('outputText');
const copyBtn = document.getElementById('copyBtn');
const timeStats = document.getElementById('timeStats');
const tagCount = document.getElementById('tagCount');

const worker = new Worker('worker.js');

generateBtn.addEventListener('click', () => {
    const text = inputText.value.trim();
    if (!text) return;

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';

    const start = performance.now();

    worker.postMessage({
        text,
        rate: speedSelect.value,
        pitch: pitchSelect.value
    });

    worker.onmessage = (e) => {
        const end = performance.now();
        const { ssml, tags } = e.data;

        outputText.textContent = ssml;
        timeStats.textContent = `${(end - start).toFixed(2)}ms`;
        tagCount.textContent = tags;

        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate SSML';
    };
});

clearBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.textContent = '';
    timeStats.textContent = '-';
    tagCount.textContent = '-';
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(outputText.textContent).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
});
