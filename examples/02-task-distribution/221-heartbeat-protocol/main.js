/**
 * 心跳協議 - 主執行緒腳本
 *
 * 功能：實現心跳協議，定期發送 PING 並等待 PONG 回應
 * 通訊模式：postMessage (PING/PONG)
 *
 * @description
 * 此腳本負責：
 * 1. 建立與管理 Web Worker
 * 2. 定期發送心跳 PING
 * 3. 處理 PONG 回應並計算延遲
 * 4. 偵測超時並處理重連
 */

// ===== 全域變數 =====

// Web Worker 實例
let worker = null;

// 心跳計時器
let heartbeatTimer = null;

// 超時計時器
let timeoutTimer = null;

// 運行時間計時器
let uptimeTimer = null;

// 是否正在運行
let isRunning = false;

// 等待回應中
let waitingForPong = false;

// 當前心跳序號
let sequence = 0;

// 當前心跳發送時間
let currentPingTime = 0;

// 連續失敗次數
let consecutiveFailures = 0;

// 設定參數
let config = {
    interval: 1000,
    timeout: 3000,
    maxRetries: 3,
    responseDelay: 100
};

// 統計資訊
let stats = {
    sent: 0,
    received: 0,
    timeout: 0,
    latencies: [],
    startTime: 0
};

// ===== DOM 元素參考 =====

const elements = {
    // 輸入元素
    heartbeatInterval: null,
    timeout: null,
    maxRetries: null,
    simulateDelay: null,

    // 按鈕元素
    startBtn: null,
    stopBtn: null,
    simulateHangBtn: null,

    // 狀態顯示
    heartIcon: null,
    connectionText: null,
    workerStatus: null,
    lastHeartbeat: null,
    latency: null,
    failedCount: null,

    // 統計顯示
    totalSent: null,
    totalReceived: null,
    totalTimeout: null,
    avgLatency: null,
    uptime: null,
    successRate: null,

    // 歷史記錄
    heartbeatHistory: null,

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
    elements.heartbeatInterval = document.getElementById('heartbeat-interval');
    elements.timeout = document.getElementById('timeout');
    elements.maxRetries = document.getElementById('max-retries');
    elements.simulateDelay = document.getElementById('simulate-delay');

    elements.startBtn = document.getElementById('start-btn');
    elements.stopBtn = document.getElementById('stop-btn');
    elements.simulateHangBtn = document.getElementById('simulate-hang-btn');

    elements.heartIcon = document.getElementById('heart-icon');
    elements.connectionText = document.getElementById('connection-text');
    elements.workerStatus = document.getElementById('worker-status');
    elements.lastHeartbeat = document.getElementById('last-heartbeat');
    elements.latency = document.getElementById('latency');
    elements.failedCount = document.getElementById('failed-count');

    elements.totalSent = document.getElementById('total-sent');
    elements.totalReceived = document.getElementById('total-received');
    elements.totalTimeout = document.getElementById('total-timeout');
    elements.avgLatency = document.getElementById('avg-latency');
    elements.uptime = document.getElementById('uptime');
    elements.successRate = document.getElementById('success-rate');

    elements.heartbeatHistory = document.getElementById('heartbeat-history');
    elements.errorMessage = document.getElementById('error-message');
}

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
    elements.startBtn.addEventListener('click', startHeartbeat);
    elements.stopBtn.addEventListener('click', stopHeartbeat);
    elements.simulateHangBtn.addEventListener('click', toggleSimulateHang);

    // 快速設定按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            elements.heartbeatInterval.value = this.dataset.interval;
            elements.timeout.value = this.dataset.timeout;
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
        case 'READY':
            handleWorkerReady();
            break;

        case 'PONG':
            handlePong(payload);
            break;

        case 'LOG':
            addHistoryEntry(payload.level, payload.message);
            break;

        case 'ERROR':
            showError(payload.message);
            break;
    }
}

/**
 * 處理 Worker 就緒
 */
function handleWorkerReady() {
    updateConnectionStatus('online');
    addHistoryEntry('info', 'Worker 已就緒，開始心跳監控');

    // 開始心跳循環
    scheduleNextHeartbeat();
}

/**
 * 處理 PONG 回應
 */
function handlePong(payload) {
    if (!waitingForPong) {
        return;
    }

    // 清除超時計時器
    clearTimeout(timeoutTimer);
    waitingForPong = false;

    // 計算延遲
    const latency = payload.pongTimestamp - payload.pingTimestamp;
    stats.received++;
    stats.latencies.push(latency);

    // 保持最近 100 筆延遲記錄
    if (stats.latencies.length > 100) {
        stats.latencies.shift();
    }

    // 重置連續失敗
    consecutiveFailures = 0;

    // 更新顯示
    updateConnectionStatus('online');
    elements.latency.textContent = `${latency} ms`;
    elements.lastHeartbeat.textContent = formatTime(new Date());
    elements.failedCount.textContent = '0';

    // 心跳動畫
    animateHeart();

    // 添加歷史記錄
    addHistoryEntry('success', `收到 PONG #${payload.sequence} (延遲: ${latency}ms)`);

    // 更新統計
    updateStats();

    // 排程下一次心跳
    scheduleNextHeartbeat();
}

/**
 * 處理 Worker 錯誤
 */
function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
    stopHeartbeat();

    if (worker) {
        worker.terminate();
    }
    initializeWorker();
}

// ===== 心跳控制 =====

/**
 * 開始心跳
 */
function startHeartbeat() {
    // 讀取設定
    config.interval = parseInt(elements.heartbeatInterval.value);
    config.timeout = parseInt(elements.timeout.value);
    config.maxRetries = parseInt(elements.maxRetries.value);
    config.responseDelay = parseInt(elements.simulateDelay.value);

    // 驗證設定
    if (config.timeout <= config.interval) {
        showError('超時時間必須大於心跳間隔');
        return;
    }

    // 重置狀態
    isRunning = true;
    waitingForPong = false;
    sequence = 0;
    consecutiveFailures = 0;
    stats = { sent: 0, received: 0, timeout: 0, latencies: [], startTime: Date.now() };

    // 更新 UI
    updateUIState(true);
    clearHistory();

    // 設定 Worker
    worker.postMessage({
        type: 'CONFIGURE',
        payload: { responseDelay: config.responseDelay }
    });

    // 啟動 Worker
    worker.postMessage({ type: 'START' });

    // 啟動運行時間更新
    uptimeTimer = setInterval(updateUptime, 1000);

    addHistoryEntry('info', '心跳協議已啟動');
}

/**
 * 停止心跳
 */
function stopHeartbeat() {
    isRunning = false;
    waitingForPong = false;

    // 清除計時器
    clearTimeout(heartbeatTimer);
    clearTimeout(timeoutTimer);
    clearInterval(uptimeTimer);

    // 停止 Worker
    worker.postMessage({ type: 'STOP' });

    // 更新 UI
    updateUIState(false);
    updateConnectionStatus('offline');

    addHistoryEntry('info', '心跳協議已停止');
}

/**
 * 切換模擬卡死
 */
let isSimulatingHang = false;

function toggleSimulateHang() {
    isSimulatingHang = !isSimulatingHang;

    worker.postMessage({
        type: 'SIMULATE_HANG',
        payload: { hang: isSimulatingHang }
    });

    elements.simulateHangBtn.textContent = isSimulatingHang ? '恢復正常' : '模擬卡死';
    elements.simulateHangBtn.className = isSimulatingHang
        ? 'btn btn-success'
        : 'btn btn-warning';

    addHistoryEntry(
        isSimulatingHang ? 'warning' : 'info',
        isSimulatingHang ? 'Worker 開始模擬卡死' : 'Worker 恢復正常'
    );
}

/**
 * 排程下一次心跳
 */
function scheduleNextHeartbeat() {
    if (!isRunning) return;

    heartbeatTimer = setTimeout(sendPing, config.interval);
}

/**
 * 發送心跳 PING
 */
function sendPing() {
    if (!isRunning || waitingForPong) return;

    sequence++;
    stats.sent++;
    currentPingTime = Date.now();
    waitingForPong = true;

    worker.postMessage({
        type: 'PING',
        payload: {
            sequence: sequence,
            timestamp: currentPingTime
        }
    });

    addHistoryEntry('info', `發送 PING #${sequence}`);
    updateStats();

    // 設定超時計時器
    timeoutTimer = setTimeout(handleTimeout, config.timeout);
}

/**
 * 處理超時
 */
function handleTimeout() {
    if (!waitingForPong) return;

    waitingForPong = false;
    consecutiveFailures++;
    stats.timeout++;

    elements.failedCount.textContent = consecutiveFailures.toString();
    addHistoryEntry('error', `PING #${sequence} 超時（連續失敗: ${consecutiveFailures}）`);

    updateStats();

    // 檢查是否達到最大重試次數
    if (consecutiveFailures >= config.maxRetries) {
        updateConnectionStatus('dead');
        addHistoryEntry('error', `連續 ${consecutiveFailures} 次超時，判定 Worker 無回應`);

        // 可選：自動嘗試重連
        // 這裡我們繼續嘗試
    }

    // 繼續嘗試
    scheduleNextHeartbeat();
}

// ===== UI 更新 =====

/**
 * 更新 UI 狀態
 */
function updateUIState(running) {
    elements.startBtn.disabled = running;
    elements.stopBtn.disabled = !running;
    elements.simulateHangBtn.disabled = !running;
    elements.heartbeatInterval.disabled = running;
    elements.timeout.disabled = running;
    elements.maxRetries.disabled = running;
    elements.simulateDelay.disabled = running;

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.disabled = running;
    });

    if (!running) {
        isSimulatingHang = false;
        elements.simulateHangBtn.textContent = '模擬卡死';
        elements.simulateHangBtn.className = 'btn btn-warning';
    }
}

/**
 * 更新連線狀態
 */
function updateConnectionStatus(status) {
    const heart = elements.heartIcon;
    const text = elements.connectionText;
    const workerStatus = elements.workerStatus;

    heart.className = 'heart-icon';
    workerStatus.className = 'detail-value';

    switch (status) {
        case 'online':
            heart.classList.add('heart-online');
            text.textContent = '連線正常';
            workerStatus.textContent = '線上';
            workerStatus.classList.add('status-online');
            break;

        case 'dead':
            heart.classList.add('heart-dead');
            text.textContent = '連線中斷';
            workerStatus.textContent = '無回應';
            workerStatus.classList.add('status-dead');
            break;

        default:
            heart.classList.add('heart-offline');
            text.textContent = '未連線';
            workerStatus.textContent = '離線';
            workerStatus.classList.add('status-offline');
    }
}

/**
 * 心跳動畫
 */
function animateHeart() {
    const heart = elements.heartIcon;
    heart.classList.add('heart-beat');
    setTimeout(() => heart.classList.remove('heart-beat'), 300);
}

/**
 * 更新統計顯示
 */
function updateStats() {
    elements.totalSent.textContent = stats.sent.toLocaleString();
    elements.totalReceived.textContent = stats.received.toLocaleString();
    elements.totalTimeout.textContent = stats.timeout.toLocaleString();

    // 計算平均延遲
    if (stats.latencies.length > 0) {
        const avg = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;
        elements.avgLatency.textContent = avg.toFixed(1);
    }

    // 計算成功率
    if (stats.sent > 0) {
        const rate = ((stats.received / stats.sent) * 100).toFixed(1);
        elements.successRate.textContent = `${rate}%`;
    }
}

/**
 * 更新運行時間
 */
function updateUptime() {
    if (!isRunning) return;

    const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    elements.uptime.textContent =
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 添加歷史記錄
 */
function addHistoryEntry(level, message) {
    const entry = document.createElement('div');
    entry.className = `history-entry history-${level}`;

    const time = formatTime(new Date());
    entry.innerHTML = `<span class="history-time">[${time}]</span> ${message}`;

    // 移除佔位文字
    const placeholder = elements.heartbeatHistory.querySelector('.history-placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    elements.heartbeatHistory.appendChild(entry);
    elements.heartbeatHistory.scrollTop = elements.heartbeatHistory.scrollHeight;

    // 限制歷史記錄數量
    while (elements.heartbeatHistory.children.length > 50) {
        elements.heartbeatHistory.removeChild(elements.heartbeatHistory.firstChild);
    }
}

/**
 * 清除歷史記錄
 */
function clearHistory() {
    elements.heartbeatHistory.innerHTML = '';
}

/**
 * 格式化時間
 */
function formatTime(date) {
    return date.toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * 顯示錯誤訊息
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    addHistoryEntry('error', message);
}

/**
 * 隱藏錯誤訊息
 */
function hideError() {
    elements.errorMessage.classList.add('hidden');
}
