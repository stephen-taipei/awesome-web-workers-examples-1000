/**
 * 訊息壓縮 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理壓縮/解壓縮操作
 * 通訊模式：postMessage
 */

// ===== 全域變數 =====

let worker = null;
let compressedData = null;
let currentAlgorithm = 'gzip';

// ===== DOM 元素參考 =====

const elements = {
    messageInput: null,
    compressBtn: null,
    decompressBtn: null,
    compareBtn: null,
    clearLogBtn: null,
    originalSize: null,
    compressedSize: null,
    compressionRatio: null,
    processTime: null,
    logContainer: null,
    visualizationSection: null,
    originalBar: null,
    compressedBar: null,
    originalBarLabel: null,
    compressedBarLabel: null,
    spaceSaved: null,
    comparisonSection: null,
    comparisonTbody: null,
    errorMessage: null
};

// ===== 預設資料 =====

const presetData = {
    small: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',

    medium: generateRepeatedText('The quick brown fox jumps over the lazy dog. ', 100),

    large: generateRepeatedText('Web Workers 是一種在背景執行緒中執行腳本的方式，不會阻塞主執行緒的 UI 渲染。這對於執行計算密集型任務非常有用。', 300),

    json: JSON.stringify({
        users: Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            name: `User ${i + 1}`,
            email: `user${i + 1}@example.com`,
            address: {
                street: `${i + 100} Main Street`,
                city: 'Taipei',
                country: 'Taiwan',
                zipCode: `${10000 + i}`
            },
            preferences: {
                theme: i % 2 === 0 ? 'dark' : 'light',
                language: 'zh-TW',
                notifications: true
            }
        }))
    }, null, 2),

    repetitive: 'AAAAAAAAAA'.repeat(500) + 'BBBBBBBBBB'.repeat(500) + 'CCCCCCCCCC'.repeat(500)
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
    updateDecompressButton();
});

function initializeElements() {
    elements.messageInput = document.getElementById('message-input');
    elements.compressBtn = document.getElementById('compress-btn');
    elements.decompressBtn = document.getElementById('decompress-btn');
    elements.compareBtn = document.getElementById('compare-btn');
    elements.clearLogBtn = document.getElementById('clear-log-btn');
    elements.originalSize = document.getElementById('original-size');
    elements.compressedSize = document.getElementById('compressed-size');
    elements.compressionRatio = document.getElementById('compression-ratio');
    elements.processTime = document.getElementById('process-time');
    elements.logContainer = document.getElementById('log-container');
    elements.visualizationSection = document.getElementById('visualization-section');
    elements.originalBar = document.getElementById('original-bar');
    elements.compressedBar = document.getElementById('compressed-bar');
    elements.originalBarLabel = document.getElementById('original-bar-label');
    elements.compressedBarLabel = document.getElementById('compressed-bar-label');
    elements.spaceSaved = document.getElementById('space-saved');
    elements.comparisonSection = document.getElementById('comparison-section');
    elements.comparisonTbody = document.getElementById('comparison-tbody');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    // 壓縮按鈕
    elements.compressBtn.addEventListener('click', handleCompress);

    // 解壓縮按鈕
    elements.decompressBtn.addEventListener('click', handleDecompress);

    // 比較按鈕
    elements.compareBtn.addEventListener('click', handleCompare);

    // 清除日誌按鈕
    elements.clearLogBtn.addEventListener('click', clearLog);

    // 預設資料按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const preset = this.dataset.preset;
            if (presetData[preset]) {
                elements.messageInput.value = presetData[preset];
                compressedData = null;
                updateDecompressButton();
            }
        });
    });

    // 演算法選擇
    document.querySelectorAll('input[name="algorithm"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentAlgorithm = this.value;
            compressedData = null;
            updateDecompressButton();
        });
    });
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        return;
    }

    // 檢查 CompressionStream 支援
    if (typeof CompressionStream === 'undefined') {
        showError('您的瀏覽器不支援 CompressionStream API');
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;

    addLog('info', '訊息壓縮 Worker 已初始化');
}

// ===== Worker 通訊 =====

function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'COMPRESS_RESULT':
            handleCompressResult(payload);
            break;

        case 'DECOMPRESS_RESULT':
            handleDecompressResult(payload);
            break;

        case 'COMPARE_RESULT':
            handleCompareResult(payload);
            break;

        case 'LOG':
            addLog(payload.level, payload.message);
            break;

        case 'ERROR':
            showError(payload.message);
            setButtonsEnabled(true);
            break;

        default:
            console.warn('未知的訊息類型:', type);
    }
}

function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
    setButtonsEnabled(true);
}

// ===== 操作處理 =====

function handleCompress() {
    const data = elements.messageInput.value;

    if (!data.trim()) {
        showError('請輸入訊息內容');
        return;
    }

    hideError();
    setButtonsEnabled(false);

    worker.postMessage({
        type: 'COMPRESS',
        payload: {
            data,
            algorithm: currentAlgorithm
        }
    });
}

function handleDecompress() {
    if (!compressedData) {
        showError('請先壓縮訊息');
        return;
    }

    hideError();
    setButtonsEnabled(false);

    worker.postMessage({
        type: 'DECOMPRESS',
        payload: {
            data: compressedData,
            algorithm: currentAlgorithm
        }
    });
}

function handleCompare() {
    const data = elements.messageInput.value;

    if (!data.trim()) {
        showError('請輸入訊息內容');
        return;
    }

    hideError();
    setButtonsEnabled(false);

    worker.postMessage({
        type: 'COMPARE',
        payload: { data }
    });
}

// ===== 結果處理 =====

function handleCompressResult(payload) {
    const { originalSize, compressedSize, ratio, duration, compressedData: data, algorithm } = payload;

    // 儲存壓縮資料
    compressedData = data;

    // 更新統計
    elements.originalSize.textContent = formatBytes(originalSize);
    elements.compressedSize.textContent = formatBytes(compressedSize);
    elements.compressionRatio.textContent = `${ratio}%`;
    elements.processTime.textContent = `${duration.toFixed(2)} ms`;

    // 更新視覺化
    updateVisualization(originalSize, compressedSize);

    setButtonsEnabled(true);
    updateDecompressButton();
}

function handleDecompressResult(payload) {
    const { decompressedText, duration } = payload;

    // 更新訊息輸入框
    elements.messageInput.value = decompressedText;

    addLog('success', `解壓縮完成，耗時 ${duration.toFixed(2)} ms`);

    setButtonsEnabled(true);
}

function handleCompareResult(payload) {
    const { originalSize, results } = payload;

    // 顯示比較區域
    elements.comparisonSection.classList.remove('hidden');

    // 清空表格
    elements.comparisonTbody.innerHTML = '';

    // 填充結果
    results.forEach(result => {
        const row = document.createElement('tr');

        if (result.error) {
            row.innerHTML = `
                <td><strong>${result.algorithm.toUpperCase()}</strong></td>
                <td colspan="4" class="error-cell">錯誤: ${result.error}</td>
            `;
        } else {
            row.innerHTML = `
                <td><strong>${result.algorithm.toUpperCase()}</strong></td>
                <td>${formatBytes(result.compressedSize)}</td>
                <td>${result.ratio}%</td>
                <td>${result.compressTime.toFixed(2)} ms</td>
                <td>${result.decompressTime.toFixed(2)} ms</td>
            `;
        }

        elements.comparisonTbody.appendChild(row);
    });

    setButtonsEnabled(true);
}

// ===== UI 更新 =====

function updateVisualization(originalSize, compressedSize) {
    elements.visualizationSection.classList.remove('hidden');

    const ratio = (compressedSize / originalSize) * 100;

    elements.originalBar.style.width = '100%';
    elements.compressedBar.style.width = `${ratio}%`;

    elements.originalBarLabel.textContent = formatBytes(originalSize);
    elements.compressedBarLabel.textContent = formatBytes(compressedSize);

    const saved = originalSize - compressedSize;
    const savedPercent = ((saved / originalSize) * 100).toFixed(1);
    elements.spaceSaved.textContent = `${formatBytes(saved)} (${savedPercent}%)`;
}

function updateDecompressButton() {
    elements.decompressBtn.disabled = !compressedData;
}

function setButtonsEnabled(enabled) {
    elements.compressBtn.disabled = !enabled;
    elements.decompressBtn.disabled = !enabled || !compressedData;
    elements.compareBtn.disabled = !enabled;
}

function addLog(level, message) {
    // 移除佔位符
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

// ===== 工具函數 =====

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function generateRepeatedText(text, times) {
    return Array(times).fill(text).join('');
}
