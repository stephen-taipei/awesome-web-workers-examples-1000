/**
 * AES Decryption - Main Thread
 */

let worker = null;

const elements = {
    ciphertextInput: null,
    ivInput: null,
    passwordInput: null,
    keysizeSelect: null,
    decryptBtn: null,
    clearBtn: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    plaintextResult: null,
    timeResult: null,
    errorMessage: null
};

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.ciphertextInput = document.getElementById('ciphertext-input');
    elements.ivInput = document.getElementById('iv-input');
    elements.passwordInput = document.getElementById('password-input');
    elements.keysizeSelect = document.getElementById('keysize-select');
    elements.decryptBtn = document.getElementById('decrypt-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.plaintextResult = document.getElementById('plaintext-result');
    elements.timeResult = document.getElementById('time-result');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    elements.decryptBtn.addEventListener('click', decrypt);
    elements.clearBtn.addEventListener('click', clearAll);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('Your browser does not support Web Workers');
        elements.decryptBtn.disabled = true;
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
            elements.decryptBtn.disabled = false;
            break;
        case 'ERROR':
            showError(payload.message);
            elements.decryptBtn.disabled = false;
            break;
    }
}

function handleWorkerError(error) {
    showError('Worker error: ' + error.message);
    elements.decryptBtn.disabled = false;
}

function decrypt() {
    const ciphertext = elements.ciphertextInput.value;
    const iv = elements.ivInput.value;
    const password = elements.passwordInput.value;
    const keySize = parseInt(elements.keysizeSelect.value);

    if (!ciphertext) {
        showError('Please enter ciphertext');
        return;
    }
    if (!iv) {
        showError('Please enter IV');
        return;
    }
    if (!password) {
        showError('Please enter password');
        return;
    }

    hideError();
    elements.resultSection.classList.add('hidden');
    elements.decryptBtn.disabled = true;
    updateProgress(0, 'Decrypting...');
    worker.postMessage({
        type: 'DECRYPT',
        payload: { ciphertext, iv, password, keySize }
    });
}

function clearAll() {
    elements.ciphertextInput.value = '';
    elements.ivInput.value = '';
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
    elements.plaintextResult.textContent = payload.plaintext;
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
