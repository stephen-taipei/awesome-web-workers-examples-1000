/**
 * #504 JSON Benchmark - Main Thread
 * Tests JSON parsing and stringification performance
 */

let worker = null;
let isRunning = false;

const elements = {
    objects: document.getElementById('objects'),
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
            elements.objects.value = btn.dataset.value;
        });
    });
}

function runBenchmark() {
    const objects = parseInt(elements.objects.value);
    if (isNaN(objects) || objects < 100) {
        showError('Please enter at least 100 objects');
        return;
    }

    hideError();
    isRunning = true;
    updateUI(true);
    elements.resultSection.classList.add('hidden');

    worker.postMessage({ type: 'START', payload: { objects } });
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
            <span class="stat-label">Stringify Time:</span>
            <span class="stat-value">${results.stringifyTime.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Parse Time:</span>
            <span class="stat-value">${results.parseTime.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Deep Clone Time:</span>
            <span class="stat-value">${results.cloneTime.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Data Size:</span>
            <span class="stat-value">${(results.dataSize / 1024).toFixed(2)} KB</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Objects Processed:</span>
            <span class="stat-value">${results.objects.toLocaleString()}</span>
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
    elements.objects.disabled = running;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = running);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
