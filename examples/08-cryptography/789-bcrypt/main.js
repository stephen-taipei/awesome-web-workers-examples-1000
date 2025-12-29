/**
 * Bcrypt Password Hashing - Main Thread
 */

let worker = null;
let lastHash = '';

const elements = {
    passwordInput: null,
    costInput: null,
    hashBtn: null,
    verifyBtn: null,
    clearBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    hashResult: null,
    costResult: null,
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
    elements.costInput = document.getElementById('cost-input');
    elements.hashBtn = document.getElementById('hash-btn');
    elements.verifyBtn = document.getElementById('verify-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.hashResult = document.getElementById('hash-result');
    elements.costResult = document.getElementById('cost-result');
    elements.timeResult = document.getElementById('time-result');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    elements.hashBtn.addEventListener('click', hashPassword);
    elements.verifyBtn.addEventListener('click', verifyPassword);
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
            lastHash = payload.hash;
            setButtonsEnabled(true);
            break;
        case 'VERIFY_RESULT':
            updateProgress(100, payload.match ? 'Password matches!' : 'Password does not match');
            setButtonsEnabled(true);
            break;
        case 'ERROR':
            showError(payload.message);
            setButtonsEnabled(true);
            break;
    }
}

function handleWorkerError(error) {
    showError('Worker error: ' + error.message);
    setButtonsEnabled(true);
}

function hashPassword() {
    const password = elements.passwordInput.value;
    const cost = parseInt(elements.costInput.value);

    if (!password) {
        showError('Please enter a password');
        return;
    }
    if (cost < 4 || cost > 31) {
        showError('Cost factor must be between 4 and 31');
        return;
    }

    hideError();
    elements.resultSection.classList.add('hidden');
    setButtonsEnabled(false);
    updateProgress(0, 'Hashing password...');
    worker.postMessage({ type: 'HASH', payload: { password, cost } });
}

function verifyPassword() {
    if (!lastHash) {
        showError('Please hash a password first');
        return;
    }

    const password = elements.passwordInput.value;
    hideError();
    setButtonsEnabled(false);
    updateProgress(0, 'Verifying password...');
    worker.postMessage({ type: 'VERIFY', payload: { password, hash: lastHash } });
}

function setButtonsEnabled(enabled) {
    elements.hashBtn.disabled = !enabled;
    elements.verifyBtn.disabled = !enabled;
}

function clearAll() {
    elements.passwordInput.value = '';
    elements.resultSection.classList.add('hidden');
    updateProgress(0, 'Ready');
    lastHash = '';
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
    elements.costResult.textContent = payload.cost;
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
