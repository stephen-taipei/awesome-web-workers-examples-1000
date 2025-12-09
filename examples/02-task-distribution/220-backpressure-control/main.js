/**
 * 背壓控制 - 主執行緒腳本
 *
 * 功能：實現背壓控制機制，根據 Worker 回報的緩衝區狀態調節發送速率
 * 通訊模式：postMessage
 *
 * @description
 * 此腳本負責：
 * 1. 建立與管理 Web Worker
 * 2. 實現背壓控制邏輯
 * 3. 根據緩衝區狀態調節發送速率
 * 4. 顯示即時統計資訊
 */

// ===== 全域變數 =====

// Web Worker 實例
let worker = null;

// 發送計時器
let sendTimer = null;

// 統計計時器
let statsTimer = null;

// 是否正在運行
let isRunning = false;

// 是否被背壓暫停
let isPaused = false;

// 訊息計數器
let messageId = 0;

// 統計資訊
let stats = {
    sent: 0,
    processed: 0,
    dropped: 0,
    paused: 0,
    startTime: 0
};

// ===== DOM 元素參考 =====

const elements = {
    // 輸入元素
    messageRate: null,
    processTime: null,
    bufferSize: null,
    highWatermark: null,

    // 按鈕元素
    startBtn: null,
    stopBtn: null,
    resetBtn: null,

    // 狀態顯示
    senderStatus: null,
    backpressureStatus: null,
    bufferUsage: null,
    bufferBar: null,

    // 統計顯示
    sentCount: null,
    processedCount: null,
    droppedCount: null,
    pausedCount: null,
    throughput: null,
    dropRate: null,

    // 日誌
    logContainer: null,

    // 錯誤訊息
    errorMessage: null
};

// ===== 初始化 =====

/**
 * 頁面載入完成後初始化應用程式
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

/**
 * 初始化 DOM 元素參考
 */
function initializeElements() {
    elements.messageRate = document.getElementById('message-rate');
    elements.processTime = document.getElementById('process-time');
    elements.bufferSize = document.getElementById('buffer-size');
    elements.highWatermark = document.getElementById('high-watermark');

    elements.startBtn = document.getElementById('start-btn');
    elements.stopBtn = document.getElementById('stop-btn');
    elements.resetBtn = document.getElementById('reset-btn');

    elements.senderStatus = document.getElementById('sender-status');
    elements.backpressureStatus = document.getElementById('backpressure-status');
    elements.bufferUsage = document.getElementById('buffer-usage');
    elements.bufferBar = document.getElementById('buffer-bar');

    elements.sentCount = document.getElementById('sent-count');
    elements.processedCount = document.getElementById('processed-count');
    elements.droppedCount = document.getElementById('dropped-count');
    elements.pausedCount = document.getElementById('paused-count');
    elements.throughput = document.getElementById('throughput');
    elements.dropRate = document.getElementById('drop-rate');

    elements.logContainer = document.getElementById('log-container');
    elements.errorMessage = document.getElementById('error-message');
}

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
    elements.startBtn.addEventListener('click', startSimulation);
    elements.stopBtn.addEventListener('click', stopSimulation);
    elements.resetBtn.addEventListener('click', resetStats);

    // 快速設定按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            elements.messageRate.value = this.dataset.rate;
            elements.processTime.value = this.dataset.time;
        });
    });
}

/**
 * 初始化 Web Worker
 */
function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        elements.startBtn.disabled = true;
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
}

// ===== Worker 通訊 =====

/**
 * 處理來自 Worker 的訊息
 */
function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'BUFFER_STATUS':
            handleBufferStatus(payload);
            break;

        case 'PROCESSED':
            handleProcessed(payload);
            break;

        case 'DROPPED':
            handleDropped(payload);
            break;

        case 'LOG':
            addLog(payload.level, payload.message);
            break;

        case 'ERROR':
            showError(payload.message);
            break;
    }
}

/**
 * 處理緩衝區狀態更新
 */
function handleBufferStatus(payload) {
    // 更新顯示
    elements.bufferUsage.textContent = `${payload.usage} / ${payload.capacity}`;
    elements.bufferBar.style.width = `${payload.percent}%`;

    // 根據狀態設定顏色
    if (payload.percent >= 80) {
        elements.bufferBar.className = 'buffer-bar buffer-danger';
    } else if (payload.percent >= 50) {
        elements.bufferBar.className = 'buffer-bar buffer-warning';
    } else {
        elements.bufferBar.className = 'buffer-bar buffer-normal';
    }

    // 背壓控制邏輯
    if (payload.isHighWater && !isPaused) {
        // 觸發背壓，暫停發送
        pauseSending();
    } else if (payload.isLowWater && isPaused) {
        // 低於低水位，恢復發送
        resumeSending();
    }

    // 更新統計
    stats.processed = payload.processed;
    stats.dropped = payload.dropped;
    updateStatsDisplay();
}

/**
 * 處理訊息處理完成
 */
function handleProcessed(payload) {
    stats.processed = payload.totalProcessed;
    updateStatsDisplay();
}

/**
 * 處理訊息丟棄
 */
function handleDropped(payload) {
    stats.dropped = payload.totalDropped;
    addLog('warning', `訊息 #${payload.id} 被丟棄（緩衝區已滿）`);
    updateStatsDisplay();
}

/**
 * 處理 Worker 錯誤
 */
function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
    stopSimulation();

    if (worker) {
        worker.terminate();
    }
    initializeWorker();
}

// ===== 模擬控制 =====

/**
 * 開始模擬
 */
function startSimulation() {
    const rate = parseInt(elements.messageRate.value);
    const processTime = parseInt(elements.processTime.value);
    const bufferSize = parseInt(elements.bufferSize.value);
    const highWatermark = parseInt(elements.highWatermark.value);

    // 驗證輸入
    if (isNaN(rate) || rate < 1 || rate > 1000) {
        showError('訊息發送速率必須在 1-1000 之間');
        return;
    }

    // 重置狀態
    isRunning = true;
    isPaused = false;
    messageId = 0;
    stats = { sent: 0, processed: 0, dropped: 0, paused: 0, startTime: Date.now() };

    // 更新 UI
    updateUIState(true);
    clearLogs();
    addLog('info', '模擬開始');

    // 設定 Worker
    worker.postMessage({
        type: 'CONFIGURE',
        payload: { processTime, bufferSize, highWatermark }
    });

    // 啟動 Worker
    worker.postMessage({ type: 'START' });

    // 開始發送訊息
    const interval = 1000 / rate;
    sendTimer = setInterval(sendMessage, interval);

    // 更新發送狀態
    updateSenderStatus('sending');

    // 啟動統計更新
    statsTimer = setInterval(updateThroughput, 1000);
}

/**
 * 停止模擬
 */
function stopSimulation() {
    isRunning = false;
    isPaused = false;

    // 停止計時器
    if (sendTimer) {
        clearInterval(sendTimer);
        sendTimer = null;
    }
    if (statsTimer) {
        clearInterval(statsTimer);
        statsTimer = null;
    }

    // 停止 Worker
    worker.postMessage({ type: 'STOP' });

    // 更新 UI
    updateUIState(false);
    updateSenderStatus('idle');
    updateBackpressureStatus('normal');

    addLog('info', '模擬停止');
}

/**
 * 重置統計
 */
function resetStats() {
    stats = { sent: 0, processed: 0, dropped: 0, paused: 0, startTime: Date.now() };
    worker.postMessage({ type: 'RESET' });

    updateStatsDisplay();
    elements.bufferUsage.textContent = '0 / ' + elements.bufferSize.value;
    elements.bufferBar.style.width = '0%';
    elements.bufferBar.className = 'buffer-bar buffer-normal';

    clearLogs();
    addLog('info', '統計資訊已重置');
}

/**
 * 發送訊息
 */
function sendMessage() {
    if (!isRunning || isPaused) {
        return;
    }

    messageId++;
    stats.sent++;

    worker.postMessage({
        type: 'MESSAGE',
        payload: {
            id: messageId,
            data: `Message ${messageId}`,
            timestamp: Date.now()
        }
    });

    updateStatsDisplay();
}

/**
 * 暫停發送（背壓觸發）
 */
function pauseSending() {
    if (isPaused) return;

    isPaused = true;
    stats.paused++;

    updateSenderStatus('paused');
    updateBackpressureStatus('active');
    addLog('warning', `背壓觸發：緩衝區使用量過高，暫停發送（第 ${stats.paused} 次）`);
    updateStatsDisplay();
}

/**
 * 恢復發送
 */
function resumeSending() {
    if (!isPaused) return;

    isPaused = false;

    updateSenderStatus('sending');
    updateBackpressureStatus('normal');
    addLog('info', '背壓解除：緩衝區使用量恢復正常，繼續發送');
}

// ===== UI 更新 =====

/**
 * 更新 UI 狀態
 */
function updateUIState(running) {
    elements.startBtn.disabled = running;
    elements.stopBtn.disabled = !running;
    elements.messageRate.disabled = running;
    elements.processTime.disabled = running;
    elements.bufferSize.disabled = running;
    elements.highWatermark.disabled = running;

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.disabled = running;
    });
}

/**
 * 更新發送者狀態顯示
 */
function updateSenderStatus(status) {
    const el = elements.senderStatus;
    el.className = 'status-value';

    switch (status) {
        case 'sending':
            el.textContent = '發送中';
            el.classList.add('status-active');
            break;
        case 'paused':
            el.textContent = '已暫停';
            el.classList.add('status-paused');
            break;
        default:
            el.textContent = '等待中';
            el.classList.add('status-idle');
    }
}

/**
 * 更新背壓狀態顯示
 */
function updateBackpressureStatus(status) {
    const el = elements.backpressureStatus;
    el.className = 'status-value';

    switch (status) {
        case 'active':
            el.textContent = '背壓啟動';
            el.classList.add('status-danger');
            break;
        default:
            el.textContent = '正常';
            el.classList.add('status-normal');
    }
}

/**
 * 更新統計顯示
 */
function updateStatsDisplay() {
    elements.sentCount.textContent = stats.sent.toLocaleString();
    elements.processedCount.textContent = stats.processed.toLocaleString();
    elements.droppedCount.textContent = stats.dropped.toLocaleString();
    elements.pausedCount.textContent = stats.paused.toLocaleString();

    // 計算丟棄率
    const dropRate = stats.sent > 0 ? ((stats.dropped / stats.sent) * 100).toFixed(1) : 0;
    elements.dropRate.textContent = `${dropRate}%`;
}

/**
 * 更新吞吐量
 */
function updateThroughput() {
    if (!isRunning) return;

    const elapsed = (Date.now() - stats.startTime) / 1000;
    const throughput = elapsed > 0 ? Math.round(stats.processed / elapsed) : 0;
    elements.throughput.textContent = throughput.toLocaleString();
}

/**
 * 添加日誌
 */
function addLog(level, message) {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;

    const time = new Date().toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    });

    entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;

    elements.logContainer.appendChild(entry);
    elements.logContainer.scrollTop = elements.logContainer.scrollHeight;

    // 限制日誌數量
    while (elements.logContainer.children.length > 100) {
        elements.logContainer.removeChild(elements.logContainer.firstChild);
    }
}

/**
 * 清除日誌
 */
function clearLogs() {
    elements.logContainer.innerHTML = '';
}

/**
 * 顯示錯誤訊息
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    addLog('error', message);
}

/**
 * 隱藏錯誤訊息
 */
function hideError() {
    elements.errorMessage.classList.add('hidden');
}
