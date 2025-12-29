/**
 * DES Encryption - Main Thread
 */

let worker = null;
let lastEncrypted = null;

const elements = {
    plaintextInput: null,
    keyInput: null,
    encryptBtn: null,
    decryptBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    outputResult: null,
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
    elements.keyInput = document.getElementById('key-input');
    elements.encryptBtn = document.getElementById('encrypt-btn');
    elements.decryptBtn = document.getElementById('decrypt-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.outputResult = document.getElementById('output-result');
    elements.timeResult = document.getElementById('time-result');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    elements.encryptBtn.addEventListener('click', encrypt);
    elements.decryptBtn.addEventListener('click', decrypt);
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
            lastEncrypted = payload.ciphertext;
            displayResult(payload.ciphertext, payload.duration, 'Encrypted');
            setButtonsEnabled(true);
            break;
        case 'DECRYPT_RESULT':
            displayResult(payload.plaintext, payload.duration, 'Decrypted');
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
    const key = elements.keyInput.value;
    if (!plaintext) {
        showError('Please enter plaintext');
        return;
    }
    if (key.length !== 8) {
        showError('Key must be exactly 8 characters');
        return;
    }
    hideError();
    setButtonsEnabled(false);
    worker.postMessage({ type: 'ENCRYPT', payload: { plaintext, key } });
}

function decrypt() {
    if (!lastEncrypted) {
        showError('Please encrypt something first');
        return;
    }
    const key = elements.keyInput.value;
    if (key.length !== 8) {
        showError('Key must be exactly 8 characters');
        return;
    }
    hideError();
    setButtonsEnabled(false);
    worker.postMessage({ type: 'DECRYPT', payload: { ciphertext: lastEncrypted, key } });
}

function setButtonsEnabled(enabled) {
    elements.encryptBtn.disabled = !enabled;
    elements.decryptBtn.disabled = !enabled;
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = percent + '%';
    elements.progressBar.textContent = percent + '%';
    elements.progressText.textContent = message;
}

function displayResult(output, duration, status) {
    updateProgress(100, status);
    elements.outputResult.textContent = output;
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
