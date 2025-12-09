/**
 * 重連機制 - 主執行緒腳本
 *
 * 功能：實現指數退避的自動重連機制
 * 通訊模式：postMessage
 *
 * @description
 * 此腳本負責：
 * 1. 建立與管理 Web Worker
 * 2. 實現指數退避重連策略
 * 3. 管理連線狀態和統計資訊
 */

// ===== 全域變數 =====

// Web Worker 實例
let worker = null;

// 重連計時器
let reconnectTimer = null;

// 倒數計時器
let countdownTimer = null;

// 運行時間計時器
let runtimeTimer = null;

// 連線狀態
let connectionState = 'disconnected'; // disconnected, connecting, connected, reconnecting

// 重連設定
let config = {
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    maxRetries: 10,
    jitterEnabled: true
};

// 當前重連狀態
let reconnectState = {
    attempts: 0,
    currentDelay: 0,
    nextReconnectTime: 0
};

// 統計資訊
let stats = {
    connections: 0,
    disconnects: 0,
    reconnectAttempts: 0,
    totalUptime: 0,
    lastConnectedTime: 0,
    startTime: 0
};

// 是否啟用自動重連
let autoReconnect = false;

// ===== DOM 元素參考 =====

const elements = {
    // 輸入元素
    initialDelay: null,
    maxDelay: null,
    multiplier: null,
    maxRetries: null,
    jitterEnabled: null,

    // 按鈕元素
    connectBtn: null,
    disconnectBtn: null,
    simulateCrashBtn: null,
    stopBtn: null,

    // 狀態顯示
    statusLight: null,
    statusText: null,
    reconnectInfo: null,
    nextReconnect: null,
    currentDelay: null,
    retryCount: null,
    reconnectProgress: null,
    progressText: null,

    // 統計顯示
    totalConnections: null,
    totalDisconnects: null,
    totalReconnects: null,
    uptimePercent: null,
    totalUptime: null,
    totalRuntime: null,

    // 歷史記錄
    connectionHistory: null,

    // 圖表
    backoffChart: null,

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
    renderBackoffChart();
});

/**
 * 初始化 DOM 元素參考
 */
function initializeElements() {
    elements.initialDelay = document.getElementById('initial-delay');
    elements.maxDelay = document.getElementById('max-delay');
    elements.multiplier = document.getElementById('multiplier');
    elements.maxRetries = document.getElementById('max-retries');
    elements.jitterEnabled = document.getElementById('jitter-enabled');

    elements.connectBtn = document.getElementById('connect-btn');
    elements.disconnectBtn = document.getElementById('disconnect-btn');
    elements.simulateCrashBtn = document.getElementById('simulate-crash-btn');
    elements.stopBtn = document.getElementById('stop-btn');

    elements.statusLight = document.getElementById('status-light');
    elements.statusText = document.getElementById('status-text');
    elements.reconnectInfo = document.getElementById('reconnect-info');
    elements.nextReconnect = document.getElementById('next-reconnect');
    elements.currentDelay = document.getElementById('current-delay');
    elements.retryCount = document.getElementById('retry-count');
    elements.reconnectProgress = document.getElementById('reconnect-progress');
    elements.progressText = document.getElementById('progress-text');

    elements.totalConnections = document.getElementById('total-connections');
    elements.totalDisconnects = document.getElementById('total-disconnects');
    elements.totalReconnects = document.getElementById('total-reconnects');
    elements.uptimePercent = document.getElementById('uptime-percent');
    elements.totalUptime = document.getElementById('total-uptime');
    elements.totalRuntime = document.getElementById('total-runtime');

    elements.connectionHistory = document.getElementById('connection-history');
    elements.backoffChart = document.getElementById('backoff-chart');
    elements.errorMessage = document.getElementById('error-message');
}

/**
 * 設定事件監聯器
 */
function setupEventListeners() {
    elements.connectBtn.addEventListener('click', startConnection);
    elements.disconnectBtn.addEventListener('click', manualDisconnect);
    elements.simulateCrashBtn.addEventListener('click', simulateCrash);
    elements.stopBtn.addEventListener('click', stopReconnection);

    // 參數變化時更新圖表
    [elements.initialDelay, elements.maxDelay, elements.multiplier, elements.maxRetries].forEach(el => {
        el.addEventListener('change', renderBackoffChart);
    });

    // 快速設定按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            elements.initialDelay.value = this.dataset.initial;
            elements.maxDelay.value = this.dataset.max;
            elements.multiplier.value = this.dataset.multiplier;
            renderBackoffChart();
        });
    });
}

/**
 * 初始化 Web Worker
 */
function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        elements.connectBtn.disabled = true;
        return;
    }

    createWorker();
}

/**
 * 創建 Worker
 */
function createWorker() {
    if (worker) {
        worker.terminate();
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
        case 'CONNECTED':
            handleConnected(payload);
            break;

        case 'DISCONNECTED':
            handleDisconnected(payload);
            break;

        case 'CONNECTION_FAILED':
            handleConnectionFailed(payload);
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
 * 處理連線成功
 */
function handleConnected(payload) {
    connectionState = 'connected';
    stats.connections++;
    stats.lastConnectedTime = Date.now();

    // 重置重連狀態
    reconnectState.attempts = 0;
    reconnectState.currentDelay = 0;

    // 停止重連計時
    clearTimeout(reconnectTimer);
    clearInterval(countdownTimer);

    updateConnectionStatus('connected');
    updateStats();
    addHistoryEntry('success', '連線成功');

    elements.progressText.textContent = '已連線';
    elements.reconnectProgress.style.width = '100%';
}

/**
 * 處理斷線
 */
function handleDisconnected(payload) {
    // 累計連線時間
    if (stats.lastConnectedTime > 0) {
        stats.totalUptime += Date.now() - stats.lastConnectedTime;
        stats.lastConnectedTime = 0;
    }

    stats.disconnects++;
    connectionState = 'disconnected';

    updateConnectionStatus('disconnected');
    updateStats();
    addHistoryEntry('warning', `斷線 (原因: ${payload.reason})`);

    // 如果啟用自動重連
    if (autoReconnect) {
        scheduleReconnect();
    }
}

/**
 * 處理連線失敗
 */
function handleConnectionFailed(payload) {
    connectionState = 'disconnected';
    addHistoryEntry('error', `連線失敗: ${payload.reason}`);

    // 如果啟用自動重連
    if (autoReconnect) {
        scheduleReconnect();
    }
}

/**
 * 處理 Worker 錯誤
 */
function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
    createWorker(); // 重新創建 Worker
}

// ===== 連線控制 =====

/**
 * 開始連線
 */
function startConnection() {
    // 讀取設定
    config.initialDelay = parseInt(elements.initialDelay.value);
    config.maxDelay = parseInt(elements.maxDelay.value);
    config.multiplier = parseFloat(elements.multiplier.value);
    config.maxRetries = parseInt(elements.maxRetries.value);
    config.jitterEnabled = elements.jitterEnabled.checked;

    // 初始化狀態
    autoReconnect = true;
    stats.startTime = Date.now();
    reconnectState = { attempts: 0, currentDelay: 0, nextReconnectTime: 0 };

    // 清除歷史
    clearHistory();

    // 更新 UI
    updateUIState(true);
    addHistoryEntry('info', '開始連線...');

    // 啟動運行時間計時器
    runtimeTimer = setInterval(updateRuntime, 1000);

    // 嘗試連線
    attemptConnection();
}

/**
 * 嘗試連線
 */
function attemptConnection() {
    connectionState = 'connecting';
    updateConnectionStatus('connecting');
    elements.progressText.textContent = '正在連線...';

    worker.postMessage({ type: 'CONNECT' });
}

/**
 * 手動斷線
 */
function manualDisconnect() {
    autoReconnect = false;
    clearTimeout(reconnectTimer);
    clearInterval(countdownTimer);

    worker.postMessage({ type: 'DISCONNECT' });
    addHistoryEntry('info', '手動斷線');
}

/**
 * 模擬崩潰
 */
function simulateCrash() {
    worker.postMessage({ type: 'SIMULATE_CRASH' });
}

/**
 * 停止重連
 */
function stopReconnection() {
    autoReconnect = false;
    clearTimeout(reconnectTimer);
    clearInterval(countdownTimer);
    clearInterval(runtimeTimer);

    connectionState = 'disconnected';
    updateConnectionStatus('stopped');
    updateUIState(false);

    elements.progressText.textContent = '已停止重連';
    addHistoryEntry('info', '已停止自動重連');
}

/**
 * 排程重連
 */
function scheduleReconnect() {
    // 檢查是否超過最大重試次數
    if (reconnectState.attempts >= config.maxRetries) {
        addHistoryEntry('error', `已達最大重試次數 (${config.maxRetries})，停止重連`);
        stopReconnection();
        return;
    }

    connectionState = 'reconnecting';
    updateConnectionStatus('reconnecting');

    // 計算延遲
    let delay = config.initialDelay * Math.pow(config.multiplier, reconnectState.attempts);
    delay = Math.min(delay, config.maxDelay);

    // 添加隨機抖動
    if (config.jitterEnabled) {
        const jitter = delay * 0.3 * Math.random();
        delay = delay + jitter;
    }

    delay = Math.round(delay);
    reconnectState.currentDelay = delay;
    reconnectState.attempts++;
    stats.reconnectAttempts++;

    reconnectState.nextReconnectTime = Date.now() + delay;

    updateStats();
    elements.currentDelay.textContent = `${(delay / 1000).toFixed(1)}s`;
    elements.retryCount.textContent = `${reconnectState.attempts} / ${config.maxRetries}`;

    addHistoryEntry('info', `將在 ${(delay / 1000).toFixed(1)} 秒後重連 (嘗試 ${reconnectState.attempts}/${config.maxRetries})`);

    // 開始倒數
    startCountdown(delay);

    // 設定重連計時器
    reconnectTimer = setTimeout(() => {
        attemptConnection();
    }, delay);
}

/**
 * 開始倒數計時
 */
function startCountdown(totalDelay) {
    clearInterval(countdownTimer);

    const updateCountdown = () => {
        const remaining = Math.max(0, reconnectState.nextReconnectTime - Date.now());
        const progress = ((totalDelay - remaining) / totalDelay) * 100;

        elements.reconnectProgress.style.width = `${progress}%`;
        elements.nextReconnect.textContent = `${(remaining / 1000).toFixed(1)}s`;
        elements.progressText.textContent = `等待重連中... ${(remaining / 1000).toFixed(1)}s`;

        if (remaining <= 0) {
            clearInterval(countdownTimer);
        }
    };

    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 100);
}

// ===== UI 更新 =====

/**
 * 更新 UI 狀態
 */
function updateUIState(running) {
    elements.connectBtn.disabled = running;
    elements.disconnectBtn.disabled = !running;
    elements.simulateCrashBtn.disabled = !running;
    elements.stopBtn.disabled = !running;

    elements.initialDelay.disabled = running;
    elements.maxDelay.disabled = running;
    elements.multiplier.disabled = running;
    elements.maxRetries.disabled = running;
    elements.jitterEnabled.disabled = running;

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.disabled = running;
    });
}

/**
 * 更新連線狀態顯示
 */
function updateConnectionStatus(status) {
    const light = elements.statusLight;
    const text = elements.statusText;

    light.className = 'status-light';

    switch (status) {
        case 'connected':
            light.classList.add('status-connected');
            text.textContent = '已連線';
            break;
        case 'connecting':
            light.classList.add('status-connecting');
            text.textContent = '連線中...';
            break;
        case 'reconnecting':
            light.classList.add('status-reconnecting');
            text.textContent = '重連中...';
            break;
        case 'stopped':
            light.classList.add('status-stopped');
            text.textContent = '已停止';
            break;
        default:
            light.classList.add('status-disconnected');
            text.textContent = '未連線';
    }
}

/**
 * 更新統計顯示
 */
function updateStats() {
    elements.totalConnections.textContent = stats.connections;
    elements.totalDisconnects.textContent = stats.disconnects;
    elements.totalReconnects.textContent = stats.reconnectAttempts;

    // 計算連線率
    const runtime = Date.now() - stats.startTime;
    let uptime = stats.totalUptime;
    if (stats.lastConnectedTime > 0) {
        uptime += Date.now() - stats.lastConnectedTime;
    }
    const uptimePercent = runtime > 0 ? ((uptime / runtime) * 100).toFixed(1) : 0;
    elements.uptimePercent.textContent = `${uptimePercent}%`;

    // 格式化連線時間
    elements.totalUptime.textContent = formatDuration(uptime);
}

/**
 * 更新運行時間
 */
function updateRuntime() {
    const runtime = Date.now() - stats.startTime;
    elements.totalRuntime.textContent = formatDuration(runtime);
    updateStats();
}

/**
 * 添加歷史記錄
 */
function addHistoryEntry(level, message) {
    const entry = document.createElement('div');
    entry.className = `history-entry history-${level}`;

    const time = new Date().toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    entry.innerHTML = `<span class="history-time">[${time}]</span> ${message}`;

    // 移除佔位文字
    const placeholder = elements.connectionHistory.querySelector('.history-placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    elements.connectionHistory.appendChild(entry);
    elements.connectionHistory.scrollTop = elements.connectionHistory.scrollHeight;

    // 限制歷史記錄數量
    while (elements.connectionHistory.children.length > 50) {
        elements.connectionHistory.removeChild(elements.connectionHistory.firstChild);
    }
}

/**
 * 清除歷史記錄
 */
function clearHistory() {
    elements.connectionHistory.innerHTML = '';
}

/**
 * 渲染指數退避圖表
 */
function renderBackoffChart() {
    const initial = parseInt(elements.initialDelay.value) || 1000;
    const max = parseInt(elements.maxDelay.value) || 30000;
    const multiplier = parseFloat(elements.multiplier.value) || 2;
    const maxRetries = parseInt(elements.maxRetries.value) || 10;

    let html = '';
    for (let i = 0; i < maxRetries; i++) {
        let delay = initial * Math.pow(multiplier, i);
        delay = Math.min(delay, max);

        const heightPercent = (delay / max) * 100;
        const delayText = delay >= 1000 ? `${(delay / 1000).toFixed(1)}s` : `${delay}ms`;

        html += `
            <div class="chart-bar">
                <div class="bar-fill" style="height: ${heightPercent}%"></div>
                <span class="bar-label">${delayText}</span>
                <span class="bar-index">${i + 1}</span>
            </div>
        `;
    }

    elements.backoffChart.innerHTML = html;
}

/**
 * 格式化持續時間
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
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
