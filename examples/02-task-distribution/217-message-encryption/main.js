/**
 * 訊息加密 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理加密/解密操作的 UI
 * 通訊模式：postMessage
 */

// ===== 全域變數 =====

let worker = null;
let hasKey = false;
let currentCipherText = null;

// ===== DOM 元素參考 =====

const elements = {
    generateKeyBtn: null,
    exportKeyBtn: null,
    importKeyBtn: null,
    encryptBtn: null,
    decryptBtn: null,
    clearLogBtn: null,
    plainText: null,
    cipherText: null,
    keyStatusText: null,
    logContainer: null,
    detailsSection: null,
    detailAlgorithm: null,
    detailKeyLength: null,
    detailIvLength: null,
    detailPlainSize: null,
    detailCipherSize: null,
    detailTime: null,
    ivDisplay: null,
    importModal: null,
    importKeyInput: null,
    confirmImportBtn: null,
    cancelImportBtn: null,
    errorMessage: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.generateKeyBtn = document.getElementById('generate-key-btn');
    elements.exportKeyBtn = document.getElementById('export-key-btn');
    elements.importKeyBtn = document.getElementById('import-key-btn');
    elements.encryptBtn = document.getElementById('encrypt-btn');
    elements.decryptBtn = document.getElementById('decrypt-btn');
    elements.clearLogBtn = document.getElementById('clear-log-btn');
    elements.plainText = document.getElementById('plain-text');
    elements.cipherText = document.getElementById('cipher-text');
    elements.keyStatusText = document.getElementById('key-status-text');
    elements.logContainer = document.getElementById('log-container');
    elements.detailsSection = document.getElementById('details-section');
    elements.detailAlgorithm = document.getElementById('detail-algorithm');
    elements.detailKeyLength = document.getElementById('detail-key-length');
    elements.detailIvLength = document.getElementById('detail-iv-length');
    elements.detailPlainSize = document.getElementById('detail-plain-size');
    elements.detailCipherSize = document.getElementById('detail-cipher-size');
    elements.detailTime = document.getElementById('detail-time');
    elements.ivDisplay = document.getElementById('iv-display');
    elements.importModal = document.getElementById('import-modal');
    elements.importKeyInput = document.getElementById('import-key-input');
    elements.confirmImportBtn = document.getElementById('confirm-import-btn');
    elements.cancelImportBtn = document.getElementById('cancel-import-btn');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    // 金鑰管理按鈕
    elements.generateKeyBtn.addEventListener('click', handleGenerateKey);
    elements.exportKeyBtn.addEventListener('click', handleExportKey);
    elements.importKeyBtn.addEventListener('click', showImportModal);

    // 加密/解密按鈕
    elements.encryptBtn.addEventListener('click', handleEncrypt);
    elements.decryptBtn.addEventListener('click', handleDecrypt);

    // 清除日誌按鈕
    elements.clearLogBtn.addEventListener('click', clearLog);

    // 匯入對話框
    elements.confirmImportBtn.addEventListener('click', handleImportKey);
    elements.cancelImportBtn.addEventListener('click', hideImportModal);

    // 點擊背景關閉對話框
    elements.importModal.addEventListener('click', function(e) {
        if (e.target === elements.importModal) {
            hideImportModal();
        }
    });
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        return;
    }

    if (typeof crypto === 'undefined' || typeof crypto.subtle === 'undefined') {
        showError('您的瀏覽器不支援 Web Crypto API');
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;

    addLog('info', '訊息加密 Worker 已初始化');
}

// ===== Worker 通訊 =====

function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'KEY_GENERATED':
            handleKeyGenerated(payload);
            break;

        case 'KEY_EXPORTED':
            handleKeyExported(payload);
            break;

        case 'KEY_IMPORTED':
            handleKeyImported(payload);
            break;

        case 'ENCRYPTED':
            handleEncrypted(payload);
            break;

        case 'DECRYPTED':
            handleDecrypted(payload);
            break;

        case 'LOG':
            addLog(payload.level, payload.message);
            break;

        case 'ERROR':
            showError(payload.message);
            break;

        default:
            console.warn('未知的訊息類型:', type);
    }
}

function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
}

// ===== 操作處理 =====

function handleGenerateKey() {
    const algorithm = document.querySelector('input[name="algorithm"]:checked').value;
    const keyLength = parseInt(document.querySelector('input[name="keyLength"]:checked').value);

    hideError();

    worker.postMessage({
        type: 'GENERATE_KEY',
        payload: { algorithm, keyLength }
    });
}

function handleExportKey() {
    worker.postMessage({ type: 'EXPORT_KEY' });
}

function showImportModal() {
    elements.importKeyInput.value = '';
    elements.importModal.classList.remove('hidden');
}

function hideImportModal() {
    elements.importModal.classList.add('hidden');
}

function handleImportKey() {
    const key = elements.importKeyInput.value.trim();

    if (!key) {
        showError('請輸入金鑰');
        return;
    }

    const algorithm = document.querySelector('input[name="algorithm"]:checked').value;
    const keyLength = parseInt(document.querySelector('input[name="keyLength"]:checked').value);

    hideImportModal();
    hideError();

    worker.postMessage({
        type: 'IMPORT_KEY',
        payload: { key, algorithm, keyLength }
    });
}

function handleEncrypt() {
    const plainText = elements.plainText.value;

    if (!plainText.trim()) {
        showError('請輸入要加密的訊息');
        return;
    }

    hideError();

    worker.postMessage({
        type: 'ENCRYPT',
        payload: { plainText }
    });
}

function handleDecrypt() {
    const cipherText = elements.cipherText.value;

    if (!cipherText.trim()) {
        showError('請先加密訊息');
        return;
    }

    hideError();

    worker.postMessage({
        type: 'DECRYPT',
        payload: { cipherText }
    });
}

// ===== 結果處理 =====

function handleKeyGenerated(payload) {
    hasKey = true;
    updateKeyStatus(payload.algorithm, payload.keyLength);
    updateButtonStates();
}

function handleKeyExported(payload) {
    // 複製到剪貼簿
    navigator.clipboard.writeText(payload.key).then(() => {
        addLog('success', '金鑰已複製到剪貼簿');
    }).catch(() => {
        // 如果剪貼簿不可用，顯示在控制台
        console.log('匯出的金鑰:', payload.key);
        addLog('info', '金鑰已輸出到控制台 (按 F12 查看)');
    });
}

function handleKeyImported(payload) {
    hasKey = true;
    updateKeyStatus(payload.algorithm, payload.keyLength);
    updateButtonStates();
}

function handleEncrypted(payload) {
    elements.cipherText.value = payload.cipherText;
    currentCipherText = payload.cipherText;

    // 更新詳情
    elements.detailsSection.classList.remove('hidden');
    elements.detailAlgorithm.textContent = payload.algorithm;
    elements.detailKeyLength.textContent = `${payload.keyLength} 位元`;
    elements.detailIvLength.textContent = `${payload.ivLength} 位元組`;
    elements.detailPlainSize.textContent = `${payload.plainSize} 位元組`;
    elements.detailCipherSize.textContent = `${payload.cipherSize} 位元組`;
    elements.detailTime.textContent = `${payload.duration.toFixed(2)} ms`;
    elements.ivDisplay.value = payload.iv;

    updateButtonStates();
}

function handleDecrypted(payload) {
    elements.plainText.value = payload.plainText;
    addLog('success', `解密完成！耗時 ${payload.duration.toFixed(2)} ms`);
}

// ===== UI 更新 =====

function updateKeyStatus(algorithm, keyLength) {
    elements.keyStatusText.textContent = `${algorithm} ${keyLength} 位元金鑰已就緒`;
    elements.keyStatusText.classList.add('ready');
}

function updateButtonStates() {
    elements.exportKeyBtn.disabled = !hasKey;
    elements.encryptBtn.disabled = !hasKey;
    elements.decryptBtn.disabled = !hasKey || !currentCipherText;
}

function addLog(level, message) {
    const placeholder = elements.logContainer.querySelector('.log-placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${level}`;

    const time = new Date().toLocaleTimeString();
    logEntry.innerHTML = `
        <span class="log-time">[${time}]</span>
        <span class="log-level">[${level.toUpperCase()}]</span>
        <span class="log-message">${message}</span>
    `;

    elements.logContainer.appendChild(logEntry);
    elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
}

function clearLog() {
    elements.logContainer.innerHTML = '<div class="log-placeholder">等待操作...</div>';
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
