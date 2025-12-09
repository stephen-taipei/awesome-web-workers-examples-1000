const inputArea = document.getElementById('inputArea');
const outputArea = document.getElementById('outputArea');
const processBtn = document.getElementById('processBtn');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const currencySelect = document.getElementById('currency');
const localeSelect = document.getElementById('locale');
const displaySelect = document.getElementById('display');

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
        text: text,
        locale: localeSelect.value,
        options: {
            style: 'currency',
            currency: currencySelect.value,
            currencyDisplay: displaySelect.value
        }
    });
});

generateBtn.addEventListener('click', () => {
    const amounts = [];
    for (let i = 0; i < 100000; i++) {
        const rand = Math.random();
        let n;
        // Generate realistic transaction amounts
        if (rand < 0.5) {
            n = Math.random() * 100; // Small purchases
        } else if (rand < 0.9) {
            n = Math.random() * 10000; // Medium
        } else {
            n = Math.random() * 1000000; // Large
        }
        amounts.push(n.toFixed(2));
    }
    inputArea.value = amounts.join('\n');
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.value = '';
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
