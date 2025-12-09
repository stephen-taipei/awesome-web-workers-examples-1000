/**
 * 流式傳輸 - 主執行緒腳本
 *
 * 功能：管理串流傳輸的 UI 和接收
 * 通訊模式：postMessage + Transferable
 */

// ===== 全域變數 =====

let worker = null;
let isStreaming = false;
let receivedChunks = [];
let startTime = null;

// ===== DOM 元素參考 =====

const elements = {
    dataSizeInput: null,
    dataSizeValue: null,
    chunkSizeInput: null,
    chunkSizeValue: null,
    delayTimeInput: null,
    delayTimeValue: null,
    startStreamBtn: null,
    cancelStreamBtn: null,
    progressBar: null,
    progressPercent: null,
    transferredSize: null,
    totalSize: null,
    chunkCount: null,
    transferSpeed: null,
    statusMessage: null,
    sourceIndicator: null,
    destinationIndicator: null,
    streamParticles: null,
    chunksDisplay: null,
    statsSection: null,
    finalTotalSize: null,
    finalChunkCount: null,
    finalDuration: null,
    finalSpeed: null,
    logContainer: null,
    clearLogBtn: null,
    errorMessage: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.dataSizeInput = document.getElementById('data-size');
    elements.dataSizeValue = document.getElementById('data-size-value');
    elements.chunkSizeInput = document.getElementById('chunk-size');
    elements.chunkSizeValue = document.getElementById('chunk-size-value');
    elements.delayTimeInput = document.getElementById('delay-time');
    elements.delayTimeValue = document.getElementById('delay-time-value');
    elements.startStreamBtn = document.getElementById('start-stream-btn');
    elements.cancelStreamBtn = document.getElementById('cancel-stream-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressPercent = document.getElementById('progress-percent');
    elements.transferredSize = document.getElementById('transferred-size');
    elements.totalSize = document.getElementById('total-size');
    elements.chunkCount = document.getElementById('chunk-count');
    elements.transferSpeed = document.getElementById('transfer-speed');
    elements.statusMessage = document.getElementById('status-message');
    elements.sourceIndicator = document.getElementById('source-indicator');
    elements.destinationIndicator = document.getElementById('destination-indicator');
    elements.streamParticles = document.getElementById('stream-particles');
    elements.chunksDisplay = document.getElementById('chunks-display');
    elements.statsSection = document.getElementById('stats-section');
    elements.finalTotalSize = document.getElementById('final-total-size');
    elements.finalChunkCount = document.getElementById('final-chunk-count');
    elements.finalDuration = document.getElementById('final-duration');
    elements.finalSpeed = document.getElementById('final-speed');
    elements.logContainer = document.getElementById('log-container');
    elements.clearLogBtn = document.getElementById('clear-log-btn');
    elements.errorMessage = document.getElementById('error-message');
}

function setupEventListeners() {
    // 滑桿更新
    elements.dataSizeInput.addEventListener('input', () => {
        elements.dataSizeValue.textContent = `${elements.dataSizeInput.value} KB`;
    });

    elements.chunkSizeInput.addEventListener('input', () => {
        elements.chunkSizeValue.textContent = `${elements.chunkSizeInput.value} KB`;
    });

    elements.delayTimeInput.addEventListener('input', () => {
        elements.delayTimeValue.textContent = `${elements.delayTimeInput.value} ms`;
    });

    // 按鈕事件
    elements.startStreamBtn.addEventListener('click', startStream);
    elements.cancelStreamBtn.addEventListener('click', cancelStream);
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

    addLog('info', '流式傳輸 Worker 已初始化');
}

// ===== Worker 通訊 =====

function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'STREAM_PROGRESS':
            handleProgress(payload);
            break;

        case 'STREAM_CHUNK':
            handleChunk(payload);
            break;

        case 'STREAM_COMPLETE':
            handleComplete(payload);
            break;

        case 'STREAM_CANCELLED':
            handleCancelled();
            break;

        case 'LOG':
            addLog(payload.level, payload.message);
            break;

        case 'ERROR':
            showError(payload.message);
            setStreamingState(false);
            break;

        default:
            console.warn('未知的訊息類型:', type);
    }
}

function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
    setStreamingState(false);
}

// ===== 操作處理 =====

function startStream() {
    const dataSize = parseInt(elements.dataSizeInput.value);
    const chunkSize = parseInt(elements.chunkSizeInput.value);
    const delay = parseInt(elements.delayTimeInput.value);

    hideError();
    resetDisplay();
    setStreamingState(true);

    receivedChunks = [];
    startTime = performance.now();

    elements.totalSize.textContent = `${dataSize} KB`;

    worker.postMessage({
        type: 'START_STREAM',
        payload: { dataSize, chunkSize, delay }
    });
}

function cancelStream() {
    worker.postMessage({ type: 'CANCEL_STREAM' });
}

// ===== 結果處理 =====

function handleProgress(payload) {
    const {
        transferredBytes,
        totalBytes,
        chunkIndex,
        totalChunks,
        progress,
        speed
    } = payload;

    // 更新進度條
    elements.progressBar.style.width = `${progress}%`;
    elements.progressPercent.textContent = `${progress.toFixed(1)}%`;

    // 更新統計
    elements.transferredSize.textContent = formatBytes(transferredBytes);
    elements.chunkCount.textContent = `${chunkIndex} / ${totalChunks}`;
    elements.transferSpeed.textContent = formatBytes(speed) + '/s';

    // 更新狀態
    elements.statusMessage.textContent = `正在傳輸... ${progress.toFixed(1)}%`;
    elements.statusMessage.className = 'status-message streaming';

    // 視覺化動畫
    animateStream();
}

function handleChunk(payload) {
    const { data, index, size } = payload;

    // 儲存區塊
    receivedChunks.push({
        index,
        size,
        data: new Uint8Array(data)
    });

    // 更新區塊顯示
    updateChunksDisplay(index, size);

    // 閃爍接收指示器
    flashIndicator(elements.destinationIndicator);
}

function handleComplete(payload) {
    const { totalBytes, totalChunks, duration, speed } = payload;

    setStreamingState(false);

    // 更新最終統計
    elements.statsSection.classList.remove('hidden');
    elements.finalTotalSize.textContent = formatBytes(totalBytes);
    elements.finalChunkCount.textContent = totalChunks;
    elements.finalDuration.textContent = `${duration.toFixed(2)} ms`;
    elements.finalSpeed.textContent = formatBytes(speed) + '/s';

    // 更新狀態
    elements.statusMessage.textContent = '傳輸完成！';
    elements.statusMessage.className = 'status-message complete';

    // 完成進度
    elements.progressBar.style.width = '100%';
    elements.progressPercent.textContent = '100%';

    addLog('success', `串流傳輸完成！共接收 ${totalChunks} 個區塊，總計 ${formatBytes(totalBytes)}`);
}

function handleCancelled() {
    setStreamingState(false);

    elements.statusMessage.textContent = '傳輸已取消';
    elements.statusMessage.className = 'status-message cancelled';

    addLog('warning', '串流傳輸已取消');
}

// ===== UI 更新 =====

function setStreamingState(streaming) {
    isStreaming = streaming;
    elements.startStreamBtn.disabled = streaming;
    elements.cancelStreamBtn.disabled = !streaming;
    elements.dataSizeInput.disabled = streaming;
    elements.chunkSizeInput.disabled = streaming;
    elements.delayTimeInput.disabled = streaming;

    if (streaming) {
        elements.sourceIndicator.classList.add('active');
    } else {
        elements.sourceIndicator.classList.remove('active');
        elements.destinationIndicator.classList.remove('active');
        stopStreamAnimation();
    }
}

function resetDisplay() {
    elements.progressBar.style.width = '0%';
    elements.progressPercent.textContent = '0%';
    elements.transferredSize.textContent = '0 KB';
    elements.chunkCount.textContent = '0 / -';
    elements.transferSpeed.textContent = '-';
    elements.statusMessage.textContent = '準備中...';
    elements.statusMessage.className = 'status-message';
    elements.statsSection.classList.add('hidden');
    elements.chunksDisplay.innerHTML = '';
}

function updateChunksDisplay(index, size) {
    const chunkEl = document.createElement('div');
    chunkEl.className = 'chunk-item new';
    chunkEl.innerHTML = `
        <span class="chunk-index">#${index}</span>
        <span class="chunk-size">${formatBytes(size)}</span>
    `;
    elements.chunksDisplay.appendChild(chunkEl);

    // 移除 new 動畫類
    setTimeout(() => {
        chunkEl.classList.remove('new');
    }, 300);

    // 自動捲動
    elements.chunksDisplay.scrollTop = elements.chunksDisplay.scrollHeight;

    // 限制顯示數量
    while (elements.chunksDisplay.children.length > 50) {
        elements.chunksDisplay.removeChild(elements.chunksDisplay.firstChild);
    }
}

function animateStream() {
    // 創建粒子動畫
    const particle = document.createElement('div');
    particle.className = 'particle';
    elements.streamParticles.appendChild(particle);

    // 移除粒子
    setTimeout(() => {
        particle.remove();
    }, 500);

    // 閃爍源指示器
    flashIndicator(elements.sourceIndicator);
}

function flashIndicator(indicator) {
    indicator.classList.add('flash');
    setTimeout(() => {
        indicator.classList.remove('flash');
    }, 100);
}

function stopStreamAnimation() {
    elements.streamParticles.innerHTML = '';
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

// ===== 工具函數 =====

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
