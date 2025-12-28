/**
 * #502 Memory Benchmark - Main Thread
 * Tests memory allocation and access performance
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
            <span class="stat-label">Allocation Time:</span>
            <span class="stat-value">${results.allocationTime.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Sequential Read:</span>
            <span class="stat-value">${results.sequentialRead.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Random Read:</span>
            <span class="stat-value">${results.randomRead.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Copy Time:</span>
            <span class="stat-value">${results.copyTime.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Memory Size:</span>
            <span class="stat-value">${(results.memoryUsed / 1024 / 1024).toFixed(2)} MB</span>
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
