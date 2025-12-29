/**
 * SHA-256 Hash Generator - Main Thread
 */

let worker = null;

const elements = {
    textInput: null,
    hashBtn: null,
    clearBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    hashResult: null,
    timeResult: null,
    sizeResult: null,
    errorMessage: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.textInput = document.getElementById('text-input');
    elements.hashBtn = document.getElementById('hash-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.hashResult = document.getElementById('hash-result');
    elements.timeResult = document.getElementById('time-result');
    elements.sizeResult = document.getElementById('size-result');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    elements.hashBtn.addEventListener('click', generateHash);
    elements.clearBtn.addEventListener('click', clearAll);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('Your browser does not support Web Workers');
        elements.hashBtn.disabled = true;
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
            elements.hashBtn.disabled = false;
            break;
        case 'ERROR':
            showError(payload.message);
            elements.hashBtn.disabled = false;
            break;
    }
}

function handleWorkerError(error) {
    showError('Worker error: ' + error.message);
    elements.hashBtn.disabled = false;
}

function generateHash() {
    const text = elements.textInput.value;
    if (!text) {
        showError('Please enter text to hash');
        return;
    }
    hideError();
    elements.resultSection.classList.add('hidden');
    elements.hashBtn.disabled = true;
    updateProgress(0, 'Generating hash...');
    worker.postMessage({ type: 'HASH', payload: { text } });
}

function clearAll() {
    elements.textInput.value = '';
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
    elements.hashResult.textContent = payload.hash;
    elements.timeResult.textContent = payload.duration.toFixed(2) + ' ms';
    elements.sizeResult.textContent = payload.inputSize + ' bytes';
    elements.resultSection.classList.remove('hidden');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
