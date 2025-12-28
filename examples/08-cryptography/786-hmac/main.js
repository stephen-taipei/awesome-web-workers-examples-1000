/**
 * HMAC Generator - Main Thread
 */

let worker = null;

const elements = {
    textInput: null,
    keyInput: null,
    algoSelect: null,
    generateBtn: null,
    clearBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    hmacResult: null,
    algoResult: null,
    timeResult: null,
    errorMessage: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.textInput = document.getElementById('text-input');
    elements.keyInput = document.getElementById('key-input');
    elements.algoSelect = document.getElementById('algo-select');
    elements.generateBtn = document.getElementById('generate-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.hmacResult = document.getElementById('hmac-result');
    elements.algoResult = document.getElementById('algo-result');
    elements.timeResult = document.getElementById('time-result');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    elements.generateBtn.addEventListener('click', generateHMAC);
    elements.clearBtn.addEventListener('click', clearAll);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('Your browser does not support Web Workers');
        elements.generateBtn.disabled = true;
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
            elements.generateBtn.disabled = false;
            break;
        case 'ERROR':
            showError(payload.message);
            elements.generateBtn.disabled = false;
            break;
    }
}

function handleWorkerError(error) {
    showError('Worker error: ' + error.message);
    elements.generateBtn.disabled = false;
}

function generateHMAC() {
    const message = elements.textInput.value;
    const key = elements.keyInput.value;
    const algorithm = elements.algoSelect.value;

    if (!message) {
        showError('Please enter a message');
        return;
    }
    if (!key) {
        showError('Please enter a secret key');
        return;
    }

    hideError();
    elements.resultSection.classList.add('hidden');
    elements.generateBtn.disabled = true;
    updateProgress(0, 'Generating HMAC...');
    worker.postMessage({ type: 'HMAC', payload: { message, key, algorithm } });
}

function clearAll() {
    elements.textInput.value = '';
    elements.keyInput.value = '';
    elements.resultSection.classList.add('hidden');
    updateProgress(0, 'Ready');
    hideError();
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = percent + '%';
    elements.progressBar.textContent = percent + '%';
    elements.progressText.textContent = message;
}

function displayResult(payload) {
    updateProgress(100, 'Complete');
    elements.hmacResult.textContent = payload.hmac;
    elements.algoResult.textContent = payload.algorithm;
    elements.timeResult.textContent = payload.duration.toFixed(2) + ' ms';
    elements.resultSection.classList.remove('hidden');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
