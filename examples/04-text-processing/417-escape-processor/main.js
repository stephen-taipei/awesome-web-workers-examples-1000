/**
 * Escape Processor - Main Thread Script
 */

let worker = null;

const elements = {
    inputText: null,
    escapeType: null,
    escapeBtn: null,
    unescapeBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    resultStats: null,
    resultOutput: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.inputText = document.getElementById('input-text');
    elements.escapeType = document.getElementById('escape-type');
    elements.escapeBtn = document.getElementById('escape-btn');
    elements.unescapeBtn = document.getElementById('unescape-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.resultOutput = document.getElementById('result-output');
}

function setupEventListeners() {
    elements.escapeBtn.addEventListener('click', () => process('ESCAPE'));
    elements.unescapeBtn.addEventListener('click', () => process('UNESCAPE'));
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        alert('Web Workers not supported');
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
            displayResult(payload);
            break;
        case 'ERROR':
            alert('Error: ' + payload.message);
            updateProgress(0, 'Error occurred');
            break;
    }
}

function handleWorkerError(error) {
    alert('Worker error: ' + error.message);
    updateProgress(0, 'Error occurred');
}

function process(operation) {
    const text = elements.inputText.value;
    if (!text) {
        alert('Please enter some text');
        return;
    }

    elements.resultSection.classList.add('hidden');
    updateProgress(0, 'Starting...');

    worker.postMessage({
        type: operation,
        payload: {
            text: text,
            escapeType: elements.escapeType.value
        }
    });
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = percent + '%';
    elements.progressBar.textContent = percent + '%';
    elements.progressText.textContent = message;
}

function displayResult(payload) {
    const { result, duration, stats } = payload;

    updateProgress(100, 'Completed');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Processing Time:</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Input Length:</span>
            <span class="stat-value">${stats.inputLength}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Output Length:</span>
            <span class="stat-value">${stats.outputLength}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Escape Type:</span>
            <span class="stat-value">${stats.escapeType}</span>
        </div>
    `;

    elements.resultOutput.value = result;
    elements.resultSection.classList.remove('hidden');
}
