/**
 * AES Encryption - Main Thread
 */

let worker = null;

const elements = {
    plaintextInput: null,
    passwordInput: null,
    keysizeSelect: null,
    encryptBtn: null,
    clearBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    ciphertextResult: null,
    ivResult: null,
    keysizeResult: null,
    timeResult: null,
    errorMessage: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.plaintextInput = document.getElementById('plaintext-input');
    elements.passwordInput = document.getElementById('password-input');
    elements.keysizeSelect = document.getElementById('keysize-select');
    elements.encryptBtn = document.getElementById('encrypt-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.ciphertextResult = document.getElementById('ciphertext-result');
    elements.ivResult = document.getElementById('iv-result');
    elements.keysizeResult = document.getElementById('keysize-result');
    elements.timeResult = document.getElementById('time-result');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    elements.encryptBtn.addEventListener('click', encrypt);
    elements.clearBtn.addEventListener('click', clearAll);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('Your browser does not support Web Workers');
        elements.encryptBtn.disabled = true;
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
            elements.encryptBtn.disabled = false;
            break;
        case 'ERROR':
            showError(payload.message);
            elements.encryptBtn.disabled = false;
            break;
    }
}

function handleWorkerError(error) {
    showError('Worker error: ' + error.message);
    elements.encryptBtn.disabled = false;
}

function encrypt() {
    const plaintext = elements.plaintextInput.value;
    const password = elements.passwordInput.value;
    const keySize = parseInt(elements.keysizeSelect.value);

    if (!plaintext) {
        showError('Please enter text to encrypt');
        return;
    }
    if (!password) {
        showError('Please enter a password');
        return;
    }

    hideError();
    elements.resultSection.classList.add('hidden');
    elements.encryptBtn.disabled = true;
    updateProgress(0, 'Encrypting...');
    worker.postMessage({
        type: 'ENCRYPT',
        payload: { plaintext, password, keySize }
    });
}

function clearAll() {
    elements.plaintextInput.value = '';
    elements.passwordInput.value = '';
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
    elements.ciphertextResult.textContent = payload.ciphertext;
    elements.ivResult.textContent = payload.iv;
    elements.keysizeResult.textContent = `AES-${payload.keySize}`;
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
