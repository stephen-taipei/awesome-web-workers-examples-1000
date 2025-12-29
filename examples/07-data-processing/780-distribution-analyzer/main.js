/**
 * Distribution Analyzer - Main Thread Script
 */

let worker = null;
let isProcessing = false;
const elements = {};

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.dataInput = document.getElementById('data-input');
    elements.processBtn = document.getElementById('process-btn');
    elements.mainBtn = document.getElementById('main-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.resultOutput = document.getElementById('result-output');
    elements.errorMessage = document.getElementById('error-message');
    elements.comparisonSection = document.getElementById('comparison-section');
    elements.workerTime = document.getElementById('worker-time');
    elements.mainThreadTime = document.getElementById('main-thread-time');
}

function setupEventListeners() {
    elements.processBtn.addEventListener('click', processWithWorker);
    elements.mainBtn.addEventListener('click', processOnMainThread);

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            generateData(parseInt(this.dataset.size));
        });
    });
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('Web Workers not supported');
        elements.processBtn.disabled = true;
        return;
    }
    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
}

function handleWorkerMessage(event) {
    const { type, payload } = event.data;
    switch (type) {
        case 'PROGRESS':
            updateProgress(payload.percent, payload.message);
            break;
        case 'RESULT':
            displayResult(payload, 'worker');
            isProcessing = false;
            updateUIState(false);
            break;
        case 'ERROR':
            showError(payload.message);
            isProcessing = false;
            updateUIState(false);
            break;
    }
}

function handleWorkerError(error) {
    showError('Worker error: ' + error.message);
    isProcessing = false;
    updateUIState(false);
}

function generateData(count) {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push({
            id: i + 1,
            value: Math.round(Math.random() * 100),
            name: 'Item_' + (i + 1),
            category: ['A', 'B', 'C'][i % 3],
            active: Math.random() > 0.5
        });
    }
    elements.dataInput.value = JSON.stringify(data, null, 2);
}

function processWithWorker() {
    try {
        const data = JSON.parse(elements.dataInput.value);
        hideError();
        isProcessing = true;
        updateUIState(true);
        updateProgress(0, 'Starting...');
        worker.postMessage({ type: 'PROCESS', payload: { data } });
    } catch (e) {
        showError('Invalid JSON: ' + e.message);
    }
}

function processOnMainThread() {
    try {
        const data = JSON.parse(elements.dataInput.value);
        hideError();
        isProcessing = true;
        updateUIState(true);
        updateProgress(0, 'Processing...');

        setTimeout(() => {
            const startTime = performance.now();
            const result = processData(data);
            result.duration = performance.now() - startTime;
            displayResult(result, 'main');
            isProcessing = false;
            updateUIState(false);
        }, 50);
    } catch (e) {
        showError('Invalid JSON: ' + e.message);
    }
}

function processData(data) {
    const items = Array.isArray(data) ? data : [data];
    const values = items.map(i => typeof i === 'number' ? i : i.value || 0).filter(v => typeof v === 'number');
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance) || 1;
    const skewness = values.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 3), 0) / n;
    const kurtosis = values.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 4), 0) / n - 3;
    const isNormal = Math.abs(skewness) < 2 && Math.abs(kurtosis) < 7;
    return { output: { count: n, mean: mean.toFixed(4), stdDev: stdDev.toFixed(4), skewness: skewness.toFixed(4), kurtosis: kurtosis.toFixed(4), isNormal, distribution: isNormal ? 'Approximately Normal' : 'Non-Normal' }, stats: { count: n, processed: n } };
}

function displayResult(result, source) {
    updateProgress(100, 'Complete');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Process Time:</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Items Processed:</span>
            <span class="stat-value">${(result.stats?.count || result.stats?.processed || 0).toLocaleString()}</span>
        </div>
    `;

    const output = typeof result.output === 'string' ? result.output : JSON.stringify(result.output, null, 2);
    elements.resultOutput.textContent = output.substring(0, 5000) + (output.length > 5000 ? '\n...(truncated)' : '');
    elements.resultSection.classList.remove('hidden');

    if (source === 'worker') {
        elements.workerTime.textContent = result.duration.toFixed(2) + ' ms';
    } else {
        elements.mainThreadTime.textContent = result.duration.toFixed(2) + ' ms';
    }
    elements.comparisonSection.classList.remove('hidden');
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = percent + '%';
    elements.progressBar.textContent = percent + '%';
    elements.progressText.textContent = message;
}

function updateUIState(processing) {
    elements.processBtn.disabled = processing;
    elements.mainBtn.disabled = processing;
    document.querySelectorAll('.preset-btn').forEach(btn => btn.disabled = processing);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
