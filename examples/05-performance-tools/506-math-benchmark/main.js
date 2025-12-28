/**
 * #506 Math Benchmark - Main Thread
 */

let worker = null;
let isRunning = false;

const elements = {
    iterations: document.getElementById('iterations'),
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
        btn.addEventListener('click', () => elements.iterations.value = btn.dataset.value);
    });
}

function runBenchmark() {
    const iterations = parseInt(elements.iterations.value);
    if (isNaN(iterations) || iterations < 1000) {
        showError('Please enter at least 1000 iterations');
        return;
    }
    hideError();
    isRunning = true;
    updateUI(true);
    elements.resultSection.classList.add('hidden');
    worker.postMessage({ type: 'START', payload: { iterations } });
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
        <div class="stat-item"><span class="stat-label">Total Time:</span><span class="stat-value">${r.totalTime.toFixed(2)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Trigonometry:</span><span class="stat-value">${r.trigTime.toFixed(2)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Logarithms:</span><span class="stat-value">${r.logTime.toFixed(2)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Power/Sqrt:</span><span class="stat-value">${r.powTime.toFixed(2)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Random:</span><span class="stat-value">${r.randomTime.toFixed(2)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Ops/Second:</span><span class="stat-value">${(r.iterations / r.totalTime * 1000).toExponential(2)}</span></div>
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
    elements.iterations.disabled = running;
    document.querySelectorAll('.preset-btn').forEach(b => b.disabled = running);
}

function showError(m) {
    elements.errorMessage.textContent = m;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
