const inputArea = document.getElementById('inputArea');
const outputArea = document.getElementById('outputArea');
const processBtn = document.getElementById('processBtn');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const formatType = document.getElementById('formatType');
const localeSelect = document.getElementById('locale');

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
        format: formatType.value,
        locale: localeSelect.value
    });
});

generateBtn.addEventListener('click', () => {
    const timestamps = [];
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < 100000; i++) {
        // Generate mix of timestamps
        const format = formatType.value;
        if (format === 'duration') {
             // 0 to 10 hours in ms
             timestamps.push(Math.floor(Math.random() * 10 * 60 * 60 * 1000));
        } else {
             // Past/Future timestamps within a week
             const offset = Math.floor(Math.random() * oneWeek * 2) - oneWeek;
             timestamps.push(now + offset);
        }
    }
    inputArea.value = timestamps.join('\n');
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    outputArea.value = '';
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
