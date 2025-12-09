const inputArea = document.getElementById('inputArea');
const outputArea = document.getElementById('outputArea');
const processBtn = document.getElementById('processBtn');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const targetFormat = document.getElementById('targetFormat');
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
        format: targetFormat.value
    });
});

generateBtn.addEventListener('click', () => {
    const dates = [];
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < 100000; i++) {
        const rand = Math.floor(Math.random() * oneYear * 2) - oneYear;
        const d = new Date(now + rand);

        // Random input formats
        const r = Math.random();
        if (r < 0.3) {
            dates.push(d.toISOString());
        } else if (r < 0.6) {
            dates.push(d.toDateString());
        } else if (r < 0.8) {
            dates.push(d.getTime()); // Timestamp
        } else {
             // MM/DD/YYYY
             dates.push(`${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`);
        }
    }

    inputArea.value = dates.join('\n');
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.value = '';
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
