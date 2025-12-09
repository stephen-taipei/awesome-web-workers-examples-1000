/**
 * 訊息驗證 - 主執行緒腳本
 *
 * 功能：管理 HMAC 簽名與驗證的 UI
 * 通訊模式：postMessage
 */

// ===== 全域變數 =====

let worker = null;
let hasKey = false;
let currentSignature = null;
let currentMessage = null;

// ===== DOM 元素參考 =====

const elements = {
    generateKeyBtn: null,
    exportKeyBtn: null,
    signBtn: null,
    verifyBtn: null,
    testTamperBtn: null,
    clearLogBtn: null,
    copySignatureBtn: null,
    messageInput: null,
    signatureOutput: null,
    verifyMessage: null,
    verifySignature: null,
    keyStatusText: null,
    signatureSection: null,
    verifyResult: null,
    verifyResultIcon: null,
    verifyResultText: null,
    detailsSection: null,
    detailAlgorithm: null,
    detailSignatureLength: null,
    detailMessageSize: null,
    detailTime: null,
    tamperResult: null,
    logContainer: null,
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
    elements.signBtn = document.getElementById('sign-btn');
    elements.verifyBtn = document.getElementById('verify-btn');
    elements.testTamperBtn = document.getElementById('test-tamper-btn');
    elements.clearLogBtn = document.getElementById('clear-log-btn');
    elements.copySignatureBtn = document.getElementById('copy-signature-btn');
    elements.messageInput = document.getElementById('message-input');
    elements.signatureOutput = document.getElementById('signature-output');
    elements.verifyMessage = document.getElementById('verify-message');
    elements.verifySignature = document.getElementById('verify-signature');
    elements.keyStatusText = document.getElementById('key-status-text');
    elements.signatureSection = document.getElementById('signature-section');
    elements.verifyResult = document.getElementById('verify-result');
    elements.verifyResultIcon = document.getElementById('verify-result-icon');
    elements.verifyResultText = document.getElementById('verify-result-text');
    elements.detailsSection = document.getElementById('details-section');
    elements.detailAlgorithm = document.getElementById('detail-algorithm');
    elements.detailSignatureLength = document.getElementById('detail-signature-length');
    elements.detailMessageSize = document.getElementById('detail-message-size');
    elements.detailTime = document.getElementById('detail-time');
    elements.tamperResult = document.getElementById('tamper-result');
    elements.logContainer = document.getElementById('log-container');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    // 金鑰管理
    elements.generateKeyBtn.addEventListener('click', handleGenerateKey);
    elements.exportKeyBtn.addEventListener('click', handleExportKey);

    // 簽名與驗證
    elements.signBtn.addEventListener('click', handleSign);
    elements.verifyBtn.addEventListener('click', handleVerify);
    elements.testTamperBtn.addEventListener('click', handleTamperTest);

    // 複製簽名
    elements.copySignatureBtn.addEventListener('click', copySignature);

    // 清除日誌
    elements.clearLogBtn.addEventListener('click', clearLog);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;

    addLog('info', '訊息驗證 Worker 已初始化');
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

        case 'SIGNED':
            handleSigned(payload);
            break;

        case 'VERIFIED':
            handleVerified(payload);
            break;

        case 'TAMPER_TEST_RESULT':
            handleTamperTestResult(payload);
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

    hideError();

    worker.postMessage({
        type: 'GENERATE_KEY',
        payload: { algorithm }
    });
}

function handleExportKey() {
    worker.postMessage({ type: 'EXPORT_KEY' });
}

function handleSign() {
    const message = elements.messageInput.value;

    if (!message.trim()) {
        showError('請輸入要簽名的訊息');
        return;
    }

    hideError();
    currentMessage = message;

    worker.postMessage({
        type: 'SIGN',
        payload: { message }
    });
}

function handleVerify() {
    const message = elements.verifyMessage.value;
    const signature = elements.verifySignature.value;

    if (!message.trim()) {
        showError('請輸入待驗證訊息');
        return;
    }

    if (!signature.trim()) {
        showError('請輸入簽名');
        return;
    }

    hideError();

    worker.postMessage({
        type: 'VERIFY',
        payload: { message, signature }
    });
}

function handleTamperTest() {
    if (!currentMessage || !currentSignature) {
        showError('請先簽名訊息');
        return;
    }

    hideError();

    worker.postMessage({
        type: 'TAMPER_TEST',
        payload: {
            message: currentMessage,
            signature: currentSignature
        }
    });
}

function copySignature() {
    const signature = elements.signatureOutput.value;
    if (signature) {
        navigator.clipboard.writeText(signature).then(() => {
            addLog('info', '簽名已複製到剪貼簿');
        });
    }
}

// ===== 結果處理 =====

function handleKeyGenerated(payload) {
    hasKey = true;
    elements.keyStatusText.textContent = `HMAC-${payload.algorithm} 金鑰已就緒`;
    elements.keyStatusText.classList.add('ready');
    updateButtonStates();
}

function handleKeyExported(payload) {
    navigator.clipboard.writeText(payload.key).then(() => {
        addLog('success', '金鑰已複製到剪貼簿');
    }).catch(() => {
        console.log('匯出的金鑰:', payload.key);
        addLog('info', '金鑰已輸出到控制台');
    });
}

function handleSigned(payload) {
    currentSignature = payload.signature;

    // 顯示簽名
    elements.signatureSection.classList.remove('hidden');
    elements.signatureOutput.value = payload.signature;

    // 自動填入驗證區域
    elements.verifyMessage.value = currentMessage;
    elements.verifySignature.value = payload.signature;

    // 顯示詳情
    elements.detailsSection.classList.remove('hidden');
    elements.detailAlgorithm.textContent = `HMAC-${payload.algorithm}`;
    elements.detailSignatureLength.textContent = `${payload.signatureLength} bytes`;
    elements.detailMessageSize.textContent = `${payload.messageSize} bytes`;
    elements.detailTime.textContent = `${payload.duration.toFixed(2)} ms`;

    updateButtonStates();
}

function handleVerified(payload) {
    elements.verifyResult.classList.remove('hidden');

    if (payload.isValid) {
        elements.verifyResult.className = 'verify-result valid';
        elements.verifyResultIcon.textContent = '✓';
        elements.verifyResultText.textContent = '簽名有效！訊息完整性已確認。';
    } else {
        elements.verifyResult.className = 'verify-result invalid';
        elements.verifyResultIcon.textContent = '✗';
        elements.verifyResultText.textContent = '簽名無效！訊息可能已被篡改。';
    }
}

function handleTamperTestResult(payload) {
    elements.tamperResult.classList.remove('hidden');

    let html = `
        <div class="tamper-test-header">
            <strong>原始訊息驗證：</strong>
            <span class="${payload.originalValid ? 'valid' : 'invalid'}">
                ${payload.originalValid ? '✓ 通過' : '✗ 失敗'}
            </span>
        </div>
        <div class="tamper-test-list">
            <h4>篡改測試結果：</h4>
            <ul>
    `;

    payload.tamperedResults.forEach(result => {
        html += `
            <li class="${result.valid ? 'valid' : 'invalid'}">
                ${result.description}: ${result.valid ? '✓ 通過 (異常!)' : '✗ 失敗 (正常)'}
            </li>
        `;
    });

    html += `
            </ul>
        </div>
        <div class="tamper-test-conclusion">
            <strong>結論：</strong>
            HMAC 成功偵測到所有篡改嘗試。任何對訊息的微小修改都會導致簽名驗證失敗。
        </div>
    `;

    elements.tamperResult.innerHTML = html;
}

// ===== UI 更新 =====

function updateButtonStates() {
    elements.exportKeyBtn.disabled = !hasKey;
    elements.signBtn.disabled = !hasKey;
    elements.verifyBtn.disabled = !hasKey;
    elements.testTamperBtn.disabled = !hasKey || !currentSignature;
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
