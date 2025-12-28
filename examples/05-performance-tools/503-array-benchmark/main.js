/**
 * #503 Array Benchmark - Main Thread
 * Tests array operations performance
 */

let worker = null;
let isRunning = false;

const elements = {
    size: document.getElementById('size'),
    runBtn: document.getElementById('run-btn'),
    stopBtn: document.getElementById('stop-btn'),
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),
    resultSection: document.getElementById('result-section'),
    resultStats: document.getElementById('result-stats'),
    errorMessage: document.getElementById('error-message')
};

document.addEventListener('DOMContentLoaded', () => {
    initWorker();
    setupEventListeners();
});

function initWorker() {
    if (typeof Worker === 'undefined') {
        showError('Web Workers not supported');
        elements.runBtn.disabled = true;
        return;
    }
    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;
    worker.onerror = handleError;
}

function setupEventListeners() {
    elements.runBtn.addEventListener('click', runBenchmark);
    elements.stopBtn.addEventListener('click', stopBenchmark);

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.size.value = btn.dataset.value;
        });
    });
}

function runBenchmark() {
    const size = parseInt(elements.size.value);
    if (isNaN(size) || size < 1000) {
        showError('Please enter at least 1000 elements');
        return;
    }

    hideError();
    isRunning = true;
    updateUI(true);
    elements.resultSection.classList.add('hidden');

    worker.postMessage({ type: 'START', payload: { size } });
}

function stopBenchmark() {
    if (worker) {
        worker.terminate();
        initWorker();
    }
    isRunning = false;
    updateUI(false);
    updateProgress(0, 'Benchmark stopped');
}

function handleMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            updateProgress(payload.percent, payload.message);
            break;
        case 'RESULT':
            displayResults(payload);
            isRunning = false;
            updateUI(false);
            break;
        case 'ERROR':
            showError(payload.message);
            isRunning = false;
            updateUI(false);
            break;
    }
}

function handleError(error) {
    showError(`Worker error: ${error.message}`);
    isRunning = false;
    updateUI(false);
    initWorker();
}

function displayResults(results) {
    updateProgress(100, 'Benchmark complete');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Total Time:</span>
            <span class="stat-value">${results.totalTime.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Push:</span>
            <span class="stat-value">${results.pushTime.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Map:</span>
            <span class="stat-value">${results.mapTime.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Filter:</span>
            <span class="stat-value">${results.filterTime.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Reduce:</span>
            <span class="stat-value">${results.reduceTime.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Sort:</span>
            <span class="stat-value">${results.sortTime.toFixed(2)} ms</span>
        </div>
    `;

    elements.resultSection.classList.remove('hidden');
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

function updateUI(running) {
    elements.runBtn.disabled = running;
    elements.stopBtn.disabled = !running;
    elements.size.disabled = running;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = running);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
