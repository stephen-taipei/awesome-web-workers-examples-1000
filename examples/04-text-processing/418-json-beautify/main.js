/**
 * JSON Beautify - Main Thread Script
 */

let worker = null;

const elements = {
    inputText: null,
    indentSize: null,
    processBtn: null,
    clearBtn: null,
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
    elements.indentSize = document.getElementById('indent-size');
    elements.processBtn = document.getElementById('process-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.resultOutput = document.getElementById('result-output');
}

function setupEventListeners() {
    elements.processBtn.addEventListener('click', processText);
    elements.clearBtn.addEventListener('click', clearAll);
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

function processText() {
    const text = elements.inputText.value;
    if (!text.trim()) {
        alert('Please enter some JSON');
        return;
    }

    elements.resultSection.classList.add('hidden');
    updateProgress(0, 'Starting...');

    worker.postMessage({
        type: 'BEAUTIFY',
        payload: {
            text: text,
            indent: elements.indentSize.value
        }
    });
}

function clearAll() {
    elements.inputText.value = '';
    elements.resultSection.classList.add('hidden');
    updateProgress(0, 'Ready');
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
            <span class="stat-label">Input Size:</span>
            <span class="stat-value">${stats.inputSize.toLocaleString()} chars</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Output Size:</span>
            <span class="stat-value">${stats.outputSize.toLocaleString()} chars</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Lines:</span>
            <span class="stat-value">${stats.lineCount}</span>
        </div>
    `;

    elements.resultOutput.value = result;
    elements.resultSection.classList.remove('hidden');
}
