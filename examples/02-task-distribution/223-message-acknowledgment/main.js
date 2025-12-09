/**
 * 訊息確認 - 主執行緒腳本
 *
 * 功能：實現訊息確認 (ACK) 機制，確保可靠傳遞
 * 通訊模式：postMessage (MSG/ACK)
 *
 * @description
 * 此腳本負責：
 * 1. 建立與管理 Web Worker
 * 2. 發送訊息並追蹤確認狀態
 * 3. 處理超時重傳
 * 4. 顯示統計資訊
 */

// ===== 全域變數 =====

// Web Worker 實例
let worker = null;

// 是否正在運行
let isRunning = false;

// 訊息序號計數器
let sequenceCounter = 0;

// 待確認訊息佇列 (Map: sequence -> message)
const pendingMessages = new Map();

// 設定參數
let config = {
    ackTimeout: 3000,
    maxRetries: 3,
    processDelay: 500,
    failRate: 20
};

// 統計資訊
let stats = {
    sent: 0,
    acked: 0,
    retries: 0,
    failed: 0,
    ackTimes: []
};

// 當前篩選器
let currentFilter = 'all';

// ===== DOM 元素參考 =====

const elements = {
    // 輸入元素
    ackTimeout: null,
    maxRetries: null,
    processDelay: null,
    failRate: null,
    messageContent: null,

    // 按鈕元素
    startBtn: null,
    sendBtn: null,
    batchBtn: null,
    stopBtn: null,
    sendCustomBtn: null,

    // 顯示區域
    messageSection: null,
    pendingCount: null,
    retryingCount: null,
    pendingMessages: null,

    // 統計顯示
    totalSent: null,
    totalAcked: null,
    totalRetries: null,
    totalFailed: null,
    successRate: null,
    avgAckTime: null,

    // 歷史記錄
    messageHistory: null,

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
    elements.ackTimeout = document.getElementById('ack-timeout');
    elements.maxRetries = document.getElementById('max-retries');
    elements.processDelay = document.getElementById('process-delay');
    elements.failRate = document.getElementById('fail-rate');
    elements.messageContent = document.getElementById('message-content');

    elements.startBtn = document.getElementById('start-btn');
    elements.sendBtn = document.getElementById('send-btn');
    elements.batchBtn = document.getElementById('batch-btn');
    elements.stopBtn = document.getElementById('stop-btn');
    elements.sendCustomBtn = document.getElementById('send-custom-btn');

    elements.messageSection = document.getElementById('message-section');
    elements.pendingCount = document.getElementById('pending-count');
    elements.retryingCount = document.getElementById('retrying-count');
    elements.pendingMessages = document.getElementById('pending-messages');

    elements.totalSent = document.getElementById('total-sent');
    elements.totalAcked = document.getElementById('total-acked');
    elements.totalRetries = document.getElementById('total-retries');
    elements.totalFailed = document.getElementById('total-failed');
    elements.successRate = document.getElementById('success-rate');
    elements.avgAckTime = document.getElementById('avg-ack-time');

    elements.messageHistory = document.getElementById('message-history');
    elements.errorMessage = document.getElementById('error-message');
}

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
    elements.startBtn.addEventListener('click', startSystem);
    elements.sendBtn.addEventListener('click', sendRandomMessage);
    elements.batchBtn.addEventListener('click', sendBatchMessages);
    elements.stopBtn.addEventListener('click', stopSystem);
    elements.sendCustomBtn.addEventListener('click', sendCustomMessage);

    // Enter 鍵發送
    elements.messageContent.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && isRunning) {
            sendCustomMessage();
        }
    });

    // 快速設定按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            elements.ackTimeout.value = this.dataset.timeout;
            elements.failRate.value = this.dataset.fail;
        });
    });

    // 篩選按鈕
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            filterHistory();
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
            addHistoryEntry('info', 'Worker 已就緒');
            break;

        case 'ACK':
            handleAck(payload);
            break;

        case 'LOG':
            // Worker 日誌（可選顯示）
            break;

        case 'ERROR':
            showError(payload.message);
            break;
    }
}

/**
 * 處理 ACK
 */
function handleAck(payload) {
    const { sequence, originalTimestamp, ackTimestamp, isDuplicate } = payload;

    // 查找待確認訊息
    const message = pendingMessages.get(sequence);

    if (!message) {
        // 可能是重複的 ACK，忽略
        return;
    }

    // 清除超時計時器
    clearTimeout(message.timeoutTimer);

    // 計算 ACK 時間
    const ackTime = ackTimestamp - originalTimestamp;
    stats.ackTimes.push(ackTime);
    if (stats.ackTimes.length > 100) {
        stats.ackTimes.shift();
    }

    // 更新統計
    stats.acked++;

    // 從待確認佇列移除
    pendingMessages.delete(sequence);

    // 更新訊息狀態
    updateMessageStatus(sequence, 'success', `已確認 (${ackTime}ms)`);

    // 更新顯示
    updatePendingDisplay();
    updateStats();
}

/**
 * 處理 Worker 錯誤
 */
function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);

    if (worker) {
        worker.terminate();
    }
    initializeWorker();
}

// ===== 系統控制 =====

/**
 * 啟動系統
 */
function startSystem() {
    // 讀取設定
    config.ackTimeout = parseInt(elements.ackTimeout.value);
    config.maxRetries = parseInt(elements.maxRetries.value);
    config.processDelay = parseInt(elements.processDelay.value);
    config.failRate = parseInt(elements.failRate.value);

    // 重置狀態
    isRunning = true;
    sequenceCounter = 0;
    pendingMessages.clear();
    stats = { sent: 0, acked: 0, retries: 0, failed: 0, ackTimes: [] };

    // 更新 UI
    updateUIState(true);
    clearHistory();
    updatePendingDisplay();
    updateStats();

    // 設定 Worker
    worker.postMessage({
        type: 'CONFIGURE',
        payload: {
            processDelay: config.processDelay,
            failRate: config.failRate
        }
    });

    // 啟動 Worker
    worker.postMessage({ type: 'START' });

    addHistoryEntry('info', '訊息確認系統已啟動');
}

/**
 * 停止系統
 */
function stopSystem() {
    isRunning = false;

    // 清除所有待確認訊息的計時器
    pendingMessages.forEach(msg => {
        clearTimeout(msg.timeoutTimer);
    });

    // 將待確認訊息標記為失敗
    pendingMessages.forEach((msg, seq) => {
        stats.failed++;
        updateMessageStatus(seq, 'failed', '系統停止');
    });
    pendingMessages.clear();

    // 停止 Worker
    worker.postMessage({ type: 'STOP' });

    // 更新 UI
    updateUIState(false);
    updatePendingDisplay();
    updateStats();

    addHistoryEntry('info', '訊息確認系統已停止');
}

/**
 * 發送隨機訊息
 */
function sendRandomMessage() {
    const messages = [
        '這是一則測試訊息',
        '重要通知：系統更新',
        '資料同步請求',
        '狀態查詢命令',
        '心跳檢測',
        '設定更新',
        '日誌記錄',
        '事件觸發通知'
    ];

    const content = messages[Math.floor(Math.random() * messages.length)];
    sendMessage(content);
}

/**
 * 發送批次訊息
 */
function sendBatchMessages() {
    for (let i = 0; i < 10; i++) {
        setTimeout(() => sendRandomMessage(), i * 100);
    }
}

/**
 * 發送自訂訊息
 */
function sendCustomMessage() {
    const content = elements.messageContent.value.trim();
    if (!content) {
        return;
    }

    sendMessage(content);
    elements.messageContent.value = '';
}

/**
 * 發送訊息
 */
function sendMessage(content, retryCount = 0) {
    if (!isRunning) {
        return;
    }

    const sequence = ++sequenceCounter;
    const timestamp = Date.now();
    const isRetry = retryCount > 0;

    // 建立訊息物件
    const message = {
        sequence,
        content,
        timestamp,
        retryCount,
        status: 'pending'
    };

    // 發送給 Worker
    worker.postMessage({
        type: 'MESSAGE',
        payload: {
            sequence,
            content,
            timestamp,
            isRetry
        }
    });

    // 更新統計
    if (!isRetry) {
        stats.sent++;
        addHistoryEntry('pending', `發送訊息 #${sequence}: ${content.substring(0, 30)}...`, sequence);
    } else {
        stats.retries++;
        updateMessageStatus(sequence, 'retrying', `重傳中 (${retryCount}/${config.maxRetries})`);
    }

    // 設定超時計時器
    message.timeoutTimer = setTimeout(() => {
        handleTimeout(sequence);
    }, config.ackTimeout);

    // 加入待確認佇列
    pendingMessages.set(sequence, message);

    // 更新顯示
    updatePendingDisplay();
    updateStats();
}

/**
 * 處理超時
 */
function handleTimeout(sequence) {
    const message = pendingMessages.get(sequence);
    if (!message) {
        return;
    }

    message.retryCount++;

    if (message.retryCount > config.maxRetries) {
        // 超過最大重試次數，標記為失敗
        stats.failed++;
        pendingMessages.delete(sequence);
        updateMessageStatus(sequence, 'failed', `失敗 (重試 ${config.maxRetries} 次後)`);
        addHistoryEntry('error', `訊息 #${sequence} 傳送失敗`);
    } else {
        // 重傳
        addHistoryEntry('warning', `訊息 #${sequence} 超時，準備重傳 (${message.retryCount}/${config.maxRetries})`);

        // 重新發送
        worker.postMessage({
            type: 'MESSAGE',
            payload: {
                sequence: message.sequence,
                content: message.content,
                timestamp: Date.now(),
                isRetry: true
            }
        });

        stats.retries++;
        updateMessageStatus(sequence, 'retrying', `重傳中 (${message.retryCount}/${config.maxRetries})`);

        // 設定新的超時計時器
        message.timeoutTimer = setTimeout(() => {
            handleTimeout(sequence);
        }, config.ackTimeout);
    }

    updatePendingDisplay();
    updateStats();
}

// ===== UI 更新 =====

/**
 * 更新 UI 狀態
 */
function updateUIState(running) {
    elements.startBtn.disabled = running;
    elements.sendBtn.disabled = !running;
    elements.batchBtn.disabled = !running;
    elements.stopBtn.disabled = !running;
    elements.sendCustomBtn.disabled = !running;
    elements.messageContent.disabled = !running;

    elements.ackTimeout.disabled = running;
    elements.maxRetries.disabled = running;
    elements.processDelay.disabled = running;
    elements.failRate.disabled = running;

    elements.messageSection.style.display = running ? 'block' : 'none';

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.disabled = running;
    });
}

/**
 * 更新待確認訊息顯示
 */
function updatePendingDisplay() {
    const container = elements.pendingMessages;
    const pendingCount = pendingMessages.size;
    let retryingCount = 0;

    container.innerHTML = '';

    if (pendingCount === 0) {
        container.innerHTML = '<div class="empty-placeholder">目前沒有待確認的訊息</div>';
    } else {
        pendingMessages.forEach((msg, seq) => {
            if (msg.retryCount > 0) {
                retryingCount++;
            }

            const item = document.createElement('div');
            item.className = `pending-item ${msg.retryCount > 0 ? 'retrying' : ''}`;
            item.innerHTML = `
                <span class="pending-seq">#${seq}</span>
                <span class="pending-content">${msg.content.substring(0, 40)}...</span>
                <span class="pending-status">${msg.retryCount > 0 ? `重傳 ${msg.retryCount}` : '等待 ACK'}</span>
            `;
            container.appendChild(item);
        });
    }

    elements.pendingCount.textContent = pendingCount;
    elements.retryingCount.textContent = retryingCount;
}

/**
 * 更新統計顯示
 */
function updateStats() {
    elements.totalSent.textContent = stats.sent;
    elements.totalAcked.textContent = stats.acked;
    elements.totalRetries.textContent = stats.retries;
    elements.totalFailed.textContent = stats.failed;

    // 成功率
    const successRate = stats.sent > 0 ? ((stats.acked / stats.sent) * 100).toFixed(1) : 0;
    elements.successRate.textContent = `${successRate}%`;

    // 平均 ACK 時間
    const avgTime = stats.ackTimes.length > 0
        ? Math.round(stats.ackTimes.reduce((a, b) => a + b, 0) / stats.ackTimes.length)
        : 0;
    elements.avgAckTime.textContent = `${avgTime}ms`;
}

/**
 * 添加歷史記錄
 */
function addHistoryEntry(status, message, sequence = null) {
    const entry = document.createElement('div');
    entry.className = `history-entry history-${status}`;
    if (sequence) {
        entry.dataset.sequence = sequence;
    }
    entry.dataset.status = status;

    const time = new Date().toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    entry.innerHTML = `<span class="history-time">[${time}]</span> ${message}`;

    // 移除佔位文字
    const placeholder = elements.messageHistory.querySelector('.history-placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    elements.messageHistory.appendChild(entry);
    elements.messageHistory.scrollTop = elements.messageHistory.scrollHeight;

    // 限制歷史記錄數量
    while (elements.messageHistory.children.length > 100) {
        elements.messageHistory.removeChild(elements.messageHistory.firstChild);
    }

    filterHistory();
}

/**
 * 更新訊息狀態
 */
function updateMessageStatus(sequence, status, statusText) {
    const entries = elements.messageHistory.querySelectorAll(`[data-sequence="${sequence}"]`);
    entries.forEach(entry => {
        entry.className = `history-entry history-${status}`;
        entry.dataset.status = status;

        // 更新狀態文字
        const existingStatus = entry.querySelector('.status-badge');
        if (existingStatus) {
            existingStatus.textContent = statusText;
        } else {
            entry.innerHTML += ` <span class="status-badge">${statusText}</span>`;
        }
    });

    filterHistory();
}

/**
 * 篩選歷史記錄
 */
function filterHistory() {
    const entries = elements.messageHistory.querySelectorAll('.history-entry');
    entries.forEach(entry => {
        const status = entry.dataset.status;
        if (currentFilter === 'all') {
            entry.style.display = '';
        } else if (currentFilter === 'success' && status === 'success') {
            entry.style.display = '';
        } else if (currentFilter === 'failed' && status === 'failed') {
            entry.style.display = '';
        } else if (currentFilter === 'pending' && (status === 'pending' || status === 'retrying')) {
            entry.style.display = '';
        } else {
            entry.style.display = 'none';
        }
    });
}

/**
 * 清除歷史記錄
 */
function clearHistory() {
    elements.messageHistory.innerHTML = '';
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
