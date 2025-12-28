/**
 * AES-GCM Authenticated Encryption - Main Thread
 */

let worker = null;
let lastEncrypted = null;

const elements = {
    plaintextInput: null,
    aadInput: null,
    passwordInput: null,
    encryptBtn: null,
    decryptBtn: null,
    clearBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    outputResult: null,
    tagResult: null,
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
    elements.aadInput = document.getElementById('aad-input');
    elements.passwordInput = document.getElementById('password-input');
    elements.encryptBtn = document.getElementById('encrypt-btn');
    elements.decryptBtn = document.getElementById('decrypt-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.outputResult = document.getElementById('output-result');
    elements.tagResult = document.getElementById('tag-result');
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
            displayEncryptResult(payload);
            setButtonsEnabled(true);
            break;
        case 'DECRYPT_RESULT':
            displayDecryptResult(payload);
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
    const aad = elements.aadInput.value;
    const password = elements.passwordInput.value;

    if (!plaintext || !password) {
        showError('Please enter plaintext and password');
        return;
    }

    hideError();
    setButtonsEnabled(false);
    updateProgress(0, 'Encrypting...');
    worker.postMessage({ type: 'ENCRYPT', payload: { plaintext, aad, password } });
}

function decrypt() {
    if (!lastEncrypted) {
        showError('Please encrypt something first');
        return;
    }

    const password = elements.passwordInput.value;
    const aad = elements.aadInput.value;

    hideError();
    setButtonsEnabled(false);
    updateProgress(0, 'Decrypting...');
    worker.postMessage({
        type: 'DECRYPT',
        payload: { ...lastEncrypted, password, aad }
    });
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

function displayEncryptResult(payload) {
    updateProgress(100, 'Encrypted');
    elements.outputResult.textContent = payload.ciphertext;
    elements.tagResult.textContent = 'Included (128-bit)';
    elements.timeResult.textContent = payload.duration.toFixed(2) + ' ms';
    elements.resultSection.classList.remove('hidden');
}

function displayDecryptResult(payload) {
    updateProgress(100, 'Decrypted & Verified');
    elements.outputResult.textContent = payload.plaintext;
    elements.tagResult.textContent = 'Verified';
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
