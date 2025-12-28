/**
 * JSON Parser - Main Thread Script
 */

let worker = null;

const elements = {
    inputText: null,
    processBtn: null,
    clearBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    resultStats: null,
    parsedOutput: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.inputText = document.getElementById('input-text');
    elements.processBtn = document.getElementById('process-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.parsedOutput = document.getElementById('parsed-output');
}

function setupEventListeners() {
    elements.processBtn.addEventListener('click', processText);
    elements.clearBtn.addEventListener('click', clearAll);

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const size = parseInt(this.dataset.size);
            generateLargeJSON(size);
        });
    });
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

function generateLargeJSON(size) {
    const data = [];
    for (let i = 0; i < size; i++) {
        data.push({
            id: i + 1,
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
            age: Math.floor(Math.random() * 50) + 18,
            active: Math.random() > 0.5,
            score: Math.random() * 100
        });
    }
    elements.inputText.value = JSON.stringify(data, null, 2);
}

function processText() {
    const text = elements.inputText.value.trim();
    if (!text) {
        alert('Please enter some JSON text');
        return;
    }

    elements.resultSection.classList.add('hidden');
    updateProgress(0, 'Starting...');

    worker.postMessage({
        type: 'PARSE',
        payload: { text }
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
    const { structure, duration, stats } = payload;

    updateProgress(100, 'Completed');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Processing Time:</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Input Size:</span>
            <span class="stat-value">${stats.inputSize.toLocaleString()} bytes</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Total Keys:</span>
            <span class="stat-value">${stats.totalKeys.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Max Depth:</span>
            <span class="stat-value">${stats.maxDepth}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Root Type:</span>
            <span class="stat-value">${stats.rootType}</span>
        </div>
    `;

    elements.parsedOutput.textContent = structure;
    elements.resultSection.classList.remove('hidden');
}
