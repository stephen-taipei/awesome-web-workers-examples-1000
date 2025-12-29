/**
 * AES-CBC Encryption - Main Thread
 */

let worker = null;
let lastEncrypted = null;

const elements = {
    plaintextInput: null,
    passwordInput: null,
    encryptBtn: null,
    decryptBtn: null,
    clearBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    outputResult: null,
    ivResult: null,
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
    elements.encryptBtn = document.getElementById('encrypt-btn');
    elements.decryptBtn = document.getElementById('decrypt-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.outputResult = document.getElementById('output-result');
    elements.ivResult = document.getElementById('iv-result');
    elements.timeResult = document.getElementById('time-result');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    elements.encryptBtn.addEventListener('click', encrypt);
    elements.decryptBtn.addEventListener('click', decrypt);
    elements.clearBtn.addEventListener('click', clearAll);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('Your browser does not support Web Workers');
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
        case 'ENCRYPT_RESULT':
            lastEncrypted = payload;
            displayResult(payload.ciphertext, payload.iv, payload.duration, 'Encrypted');
            setButtonsEnabled(true);
            break;
        case 'DECRYPT_RESULT':
            displayResult(payload.plaintext, '-', payload.duration, 'Decrypted');
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

function encrypt() {
    const plaintext = elements.plaintextInput.value;
    const password = elements.passwordInput.value;
    if (!plaintext || !password) {
        showError('Please enter plaintext and password');
        return;
    }
    hideError();
    setButtonsEnabled(false);
    worker.postMessage({ type: 'ENCRYPT', payload: { plaintext, password } });
}

function decrypt() {
    if (!lastEncrypted) {
        showError('Please encrypt something first');
        return;
    }
    const password = elements.passwordInput.value;
    hideError();
    setButtonsEnabled(false);
    worker.postMessage({ type: 'DECRYPT', payload: { ...lastEncrypted, password } });
}

function setButtonsEnabled(enabled) {
    elements.encryptBtn.disabled = !enabled;
    elements.decryptBtn.disabled = !enabled;
}

function clearAll() {
    elements.plaintextInput.value = '';
    elements.resultSection.classList.add('hidden');
    updateProgress(0, 'Ready');
    lastEncrypted = null;
    hideError();
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = percent + '%';
    elements.progressBar.textContent = percent + '%';
    elements.progressText.textContent = message;
}

function displayResult(output, iv, duration, status) {
    updateProgress(100, status);
    elements.outputResult.textContent = output;
    elements.ivResult.textContent = iv;
    elements.timeResult.textContent = duration.toFixed(2) + ' ms';
    elements.resultSection.classList.remove('hidden');
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
