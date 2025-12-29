/**
 * #508 Recursion Benchmark - Main Thread
 */

let worker = null;
let isRunning = false;

const elements = {
    depth: document.getElementById('depth'),
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
        btn.addEventListener('click', () => elements.depth.value = btn.dataset.value);
    });
}

function runBenchmark() {
    const depth = parseInt(elements.depth.value);
    if (isNaN(depth) || depth < 10 || depth > 45) {
        showError('Please enter depth between 10 and 45');
        return;
    }
    hideError();
    isRunning = true;
    updateUI(true);
    elements.resultSection.classList.add('hidden');
    worker.postMessage({ type: 'START', payload: { depth } });
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
        <div class="stat-item"><span class="stat-label">Recursive Fibonacci:</span><span class="stat-value">${r.recursiveTime.toFixed(2)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Iterative Fibonacci:</span><span class="stat-value">${r.iterativeTime.toFixed(2)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Memoized Fibonacci:</span><span class="stat-value">${r.memoizedTime.toFixed(2)} ms</span></div>
        <div class="stat-item"><span class="stat-label">Fibonacci Result:</span><span class="stat-value">${r.result}</span></div>
        <div class="stat-item"><span class="stat-label">Speedup (Iter/Rec):</span><span class="stat-value">${(r.recursiveTime / r.iterativeTime).toFixed(1)}x</span></div>
        <div class="stat-item"><span class="stat-label">Depth:</span><span class="stat-value">${r.depth}</span></div>
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
    elements.depth.disabled = running;
    document.querySelectorAll('.preset-btn').forEach(b => b.disabled = running);
}

function showError(m) {
    elements.errorMessage.textContent = m;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
