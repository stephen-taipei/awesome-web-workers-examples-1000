const inputArea = document.getElementById('inputArea');
const outputArea = document.getElementById('outputArea');
const processBtn = document.getElementById('processBtn');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const processedCount = document.getElementById('processedCount');
const timeTaken = document.getElementById('timeTaken');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === 'progress') {
            const percent = Math.round(data.progress * 100);
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${percent}%`;
        } else if (type === 'result') {
            outputArea.value = data.output;
            processedCount.textContent = data.count.toLocaleString();
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            processBtn.disabled = false;
        }
    };
}

processBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    processBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    outputArea.value = '';

    initWorker();

    worker.postMessage({
        type: 'process',
        text: text
    });
});

generateBtn.addEventListener('click', () => {
    const numbers = [];
    for (let i = 0; i < 100000; i++) {
        // Generate random large integers
        const digits = Math.floor(Math.random() * 12) + 1; // 1 to 12 digits
        const min = Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        const n = Math.floor(Math.random() * (max - min + 1)) + min;
        numbers.push(n);
    }
    inputArea.value = numbers.join('\n');
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.value = '';
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
