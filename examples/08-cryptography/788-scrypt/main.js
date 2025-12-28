/**
 * Scrypt Key Derivation - Main Thread
 */

let worker = null;

const elements = {
    passwordInput: null,
    saltInput: null,
    nInput: null,
    rInput: null,
    pInput: null,
    dklenInput: null,
    deriveBtn: null,
    clearBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    keyResult: null,
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
    elements.nInput = document.getElementById('n-input');
    elements.rInput = document.getElementById('r-input');
    elements.pInput = document.getElementById('p-input');
    elements.dklenInput = document.getElementById('dklen-input');
    elements.deriveBtn = document.getElementById('derive-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.keyResult = document.getElementById('key-result');
    elements.paramsResult = document.getElementById('params-result');
    elements.timeResult = document.getElementById('time-result');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    elements.deriveBtn.addEventListener('click', deriveKey);
    elements.clearBtn.addEventListener('click', clearAll);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('Your browser does not support Web Workers');
        elements.deriveBtn.disabled = true;
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
            elements.deriveBtn.disabled = false;
            break;
        case 'ERROR':
            showError(payload.message);
            elements.deriveBtn.disabled = false;
            break;
    }
}

function handleWorkerError(error) {
    showError('Worker error: ' + error.message);
    elements.deriveBtn.disabled = false;
}

function deriveKey() {
    const password = elements.passwordInput.value;
    const salt = elements.saltInput.value;
    const N = parseInt(elements.nInput.value);
    const r = parseInt(elements.rInput.value);
    const p = parseInt(elements.pInput.value);
    const dkLen = parseInt(elements.dklenInput.value);

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
    elements.deriveBtn.disabled = true;
    updateProgress(0, 'Deriving key with Scrypt...');
    worker.postMessage({
        type: 'DERIVE',
        payload: { password, salt, N, r, p, dkLen }
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
    elements.keyResult.textContent = payload.key;
    elements.paramsResult.textContent = `N=${payload.N}, r=${payload.r}, p=${payload.p}`;
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
