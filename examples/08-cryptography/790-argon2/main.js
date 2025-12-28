/**
 * Argon2 Password Hashing - Main Thread
 */

let worker = null;

const elements = {
    passwordInput: null,
    saltInput: null,
    memoryInput: null,
    iterationsInput: null,
    parallelismInput: null,
    hashlenInput: null,
    hashBtn: null,
    clearBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    hashResult: null,
    paramsResult: null,
    timeResult: null,
    errorMessage: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.passwordInput = document.getElementById('password-input');
    elements.saltInput = document.getElementById('salt-input');
    elements.memoryInput = document.getElementById('memory-input');
    elements.iterationsInput = document.getElementById('iterations-input');
    elements.parallelismInput = document.getElementById('parallelism-input');
    elements.hashlenInput = document.getElementById('hashlen-input');
    elements.hashBtn = document.getElementById('hash-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.hashResult = document.getElementById('hash-result');
    elements.paramsResult = document.getElementById('params-result');
    elements.timeResult = document.getElementById('time-result');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    elements.hashBtn.addEventListener('click', hashPassword);
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

function hashPassword() {
    const password = elements.passwordInput.value;
    const salt = elements.saltInput.value;
    const memory = parseInt(elements.memoryInput.value);
    const iterations = parseInt(elements.iterationsInput.value);
    const parallelism = parseInt(elements.parallelismInput.value);
    const hashLen = parseInt(elements.hashlenInput.value);

    if (!password) {
        showError('Please enter a password');
        return;
    }
    if (!salt) {
        showError('Please enter a salt');
        return;
    }

    hideError();
    elements.resultSection.classList.add('hidden');
    elements.hashBtn.disabled = true;
    updateProgress(0, 'Hashing with Argon2...');
    worker.postMessage({
        type: 'HASH',
        payload: { password, salt, memory, iterations, parallelism, hashLen }
    });
}

function clearAll() {
    elements.passwordInput.value = '';
    elements.saltInput.value = '';
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
    elements.paramsResult.textContent = `m=${payload.memory}, t=${payload.iterations}, p=${payload.parallelism}`;
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
