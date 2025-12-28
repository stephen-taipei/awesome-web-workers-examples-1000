const versionSelect = document.getElementById('versionSelect');
const countInput = document.getElementById('countInput');
const formatSelect = document.getElementById('formatSelect');
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const outputArea = document.getElementById('outputArea');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const uuidCount = document.getElementById('uuidCount');
const timeTaken = document.getElementById('timeTaken');
const uuidsPerSec = document.getElementById('uuidsPerSec');

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
            outputArea.value = data.uuids.join('\n');
            uuidCount.textContent = data.count.toLocaleString();
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;
            const perSec = data.time > 0 ? Math.round(data.count / (data.time / 1000)) : 0;
            uuidsPerSec.textContent = perSec.toLocaleString();

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            generateBtn.disabled = false;
        }
    };
}

generateBtn.addEventListener('click', () => {
    const version = parseInt(versionSelect.value);
    const count = parseInt(countInput.value) || 100;
    const format = formatSelect.value;

    generateBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
    outputArea.value = '';

    initWorker();

    worker.postMessage({
        type: 'generate',
        version: version,
        count: count,
        format: format
    });
});

copyBtn.addEventListener('click', () => {
    if (outputArea.value) {
        navigator.clipboard.writeText(outputArea.value);
    }
});

clearBtn.addEventListener('click', () => {
    outputArea.value = '';
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
