/**
 * Base64 Codec - Main Thread Script
 */

let worker = null;

const elements = {
    inputText: null,
    encodeBtn: null,
    decodeBtn: null,
    copyBtn: null,
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
    elements.encodeBtn = document.getElementById('encode-btn');
    elements.decodeBtn = document.getElementById('decode-btn');
    elements.copyBtn = document.getElementById('copy-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.resultOutput = document.getElementById('result-output');
}

function setupEventListeners() {
    elements.encodeBtn.addEventListener('click', () => process('encode'));
    elements.decodeBtn.addEventListener('click', () => process('decode'));
    elements.copyBtn.addEventListener('click', copyToClipboard);
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
        type: operation.toUpperCase(),
        payload: { text }
    });
}

function copyToClipboard() {
    elements.resultOutput.select();
    document.execCommand('copy');
    alert('Copied to clipboard!');
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
            <span class="stat-value">${stats.inputLength.toLocaleString()} chars</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Output Length:</span>
            <span class="stat-value">${stats.outputLength.toLocaleString()} chars</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Operation:</span>
            <span class="stat-value">${stats.operation}</span>
        </div>
    `;

    elements.resultOutput.value = result;
    elements.resultSection.classList.remove('hidden');
}
