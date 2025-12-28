/**
 * #510 Search Benchmark - Main Thread
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
    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;
    worker.onerror = handleError;
}

function setupEventListeners() {
    elements.runBtn.addEventListener('click', runBenchmark);
    elements.stopBtn.addEventListener('click', stopBenchmark);
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => elements.size.value = btn.dataset.value);
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
    worker.terminate();
    initWorker();
    isRunning = false;
    updateUI(false);
    updateProgress(0, 'Stopped');
}

function handleMessage(event) {
    const { type, payload } = event.data;
    if (type === 'PROGRESS') updateProgress(payload.percent, payload.message);
    else if (type === 'RESULT') {
        displayResults(payload);
        isRunning = false;
        updateUI(false);
    }
}

function handleError(error) {
    showError(`Worker error: ${error.message}`);
    isRunning = false;
    updateUI(false);
}

function displayResults(r) {
    updateProgress(100, 'Complete');
    elements.resultStats.innerHTML = `
        <div class="stat-item"><span class="stat-label">Linear Search:</span><span class="stat-value">${r.linearTime.toFixed(4)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Binary Search:</span><span class="stat-value">${r.binaryTime.toFixed(4)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Map Lookup:</span><span class="stat-value">${r.mapTime.toFixed(4)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Set Has:</span><span class="stat-value">${r.setTime.toFixed(4)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Fastest:</span><span class="stat-value">${r.fastest}</span></div>
        <div class="stat-item"><span class="stat-label">Array Size:</span><span class="stat-value">${r.size.toLocaleString()}</span></div>
    `;
    elements.resultSection.classList.remove('hidden');
}

function updateProgress(p, m) {
    elements.progressBar.style.width = `${p}%`;
    elements.progressBar.textContent = `${p}%`;
    elements.progressText.textContent = m;
}

function updateUI(running) {
    elements.runBtn.disabled = running;
    elements.stopBtn.disabled = !running;
    elements.size.disabled = running;
    document.querySelectorAll('.preset-btn').forEach(b => b.disabled = running);
}

function showError(m) {
    elements.errorMessage.textContent = m;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
