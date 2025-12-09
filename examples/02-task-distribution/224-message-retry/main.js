/**
 * 訊息重傳機制 - 主執行緒腳本
 *
 * 功能：管理訊息重傳邏輯，包含重傳佇列與退避策略
 * 通訊模式：postMessage with retry queue
 *
 * @description
 * 此腳本負責：
 * 1. 管理 Web Worker 生命週期
 * 2. 實作重傳佇列與退避策略
 * 3. 追蹤訊息狀態與統計
 * 4. 處理使用者互動與結果顯示
 */

// ===== 全域變數 =====

let worker = null;
let messageIdCounter = 0;

// 訊息追蹤
const pendingMessages = new Map(); // messageId -> message info

// 重傳佇列
const retryQueue = [];
let isProcessingQueue = false;

// 統計資料
const stats = {
    totalSent: 0,
    totalSuccess: 0,
    totalRetries: 0,
    totalFailed: 0
};

// ===== DOM 元素 =====

const elements = {
    maxRetries: null,
    retryDelay: null,
    failureRate: null,
    backoffType: null,
    messageInput: null,
    sendBtn: null,
    batchBtn: null,
    clearBtn: null,
    queueContainer: null,
    logContainer: null,
    totalSent: null,
    totalSuccess: null,
    totalRetries: null,
    totalFailed: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.maxRetries = document.getElementById('max-retries');
    elements.retryDelay = document.getElementById('retry-delay');
    elements.failureRate = document.getElementById('failure-rate');
    elements.backoffType = document.getElementById('backoff-type');
    elements.messageInput = document.getElementById('message-input');
    elements.sendBtn = document.getElementById('send-btn');
    elements.batchBtn = document.getElementById('batch-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.queueContainer = document.getElementById('queue-container');
    elements.logContainer = document.getElementById('log-container');
    elements.totalSent = document.getElementById('total-sent');
    elements.totalSuccess = document.getElementById('total-success');
    elements.totalRetries = document.getElementById('total-retries');
    elements.totalFailed = document.getElementById('total-failed');
}

function setupEventListeners() {
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.batchBtn.addEventListener('click', sendBatchMessages);
    elements.clearBtn.addEventListener('click', clearLogs);
    elements.failureRate.addEventListener('change', updateWorkerConfig);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        addLog('error', '您的瀏覽器不支援 Web Workers');
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;

    // 初始化 Worker 配置
    updateWorkerConfig();
}

// ===== Worker 通訊 =====

function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'CONFIGURED':
            addLog('info', `Worker 配置更新：失敗率 ${payload.failureRate}%`);
            break;

        case 'MESSAGE_SUCCESS':
            handleMessageSuccess(payload);
            break;

        case 'MESSAGE_FAILED':
            handleMessageFailed(payload);
            break;

        case 'ERROR':
            addLog('error', `Worker 錯誤: ${payload.message}`);
            break;
    }
}

function handleWorkerError(error) {
    addLog('error', `Worker 發生錯誤: ${error.message}`);
}

function updateWorkerConfig() {
    if (worker) {
        worker.postMessage({
            type: 'CONFIGURE',
            payload: {
                failureRate: parseInt(elements.failureRate.value)
            }
        });
    }
}

// ===== 訊息發送 =====

function sendMessage() {
    const content = elements.messageInput.value.trim();
    if (!content) {
        addLog('warning', '請輸入訊息內容');
        return;
    }

    const messageId = ++messageIdCounter;
    const message = {
        messageId: messageId,
        content: content,
        attempt: 1,
        maxRetries: parseInt(elements.maxRetries.value),
        retryDelay: parseInt(elements.retryDelay.value),
        backoffType: elements.backoffType.value,
        createdAt: Date.now()
    };

    pendingMessages.set(messageId, message);
    stats.totalSent++;
    updateStats();

    addLog('send', `發送訊息 #${messageId}: "${content}"`);

    worker.postMessage({
        type: 'PROCESS_MESSAGE',
        payload: {
            messageId: messageId,
            content: content,
            attempt: 1
        }
    });
}

function sendBatchMessages() {
    const baseContent = elements.messageInput.value.trim() || 'Batch Message';

    for (let i = 1; i <= 5; i++) {
        const messageId = ++messageIdCounter;
        const content = `${baseContent} #${i}`;
        const message = {
            messageId: messageId,
            content: content,
            attempt: 1,
            maxRetries: parseInt(elements.maxRetries.value),
            retryDelay: parseInt(elements.retryDelay.value),
            backoffType: elements.backoffType.value,
            createdAt: Date.now()
        };

        pendingMessages.set(messageId, message);
        stats.totalSent++;

        worker.postMessage({
            type: 'PROCESS_MESSAGE',
            payload: {
                messageId: messageId,
                content: content,
                attempt: 1
            }
        });
    }

    updateStats();
    addLog('send', `批次發送 5 則訊息`);
}

// ===== 訊息結果處理 =====

function handleMessageSuccess(payload) {
    const { messageId, content, attempt } = payload;
    const message = pendingMessages.get(messageId);

    if (message) {
        pendingMessages.delete(messageId);
        stats.totalSuccess++;
        updateStats();

        addLog('success', `訊息 #${messageId} 成功 (第 ${attempt} 次嘗試): "${content}"`);

        // 從佇列中移除
        removeFromQueue(messageId);
    }
}

function handleMessageFailed(payload) {
    const { messageId, content, attempt, error } = payload;
    const message = pendingMessages.get(messageId);

    if (!message) return;

    addLog('warning', `訊息 #${messageId} 失敗 (第 ${attempt} 次): ${error}`);

    if (attempt < message.maxRetries) {
        // 加入重傳佇列
        message.attempt = attempt + 1;
        const delay = calculateDelay(message);

        addLog('retry', `訊息 #${messageId} 將在 ${delay}ms 後重試 (第 ${message.attempt} 次)`);

        addToRetryQueue(message, delay);
        stats.totalRetries++;
    } else {
        // 達到最大重試次數
        pendingMessages.delete(messageId);
        stats.totalFailed++;

        addLog('error', `訊息 #${messageId} 最終失敗，已達最大重試次數 (${message.maxRetries})`);
        removeFromQueue(messageId);
    }

    updateStats();
}

// ===== 退避策略 =====

function calculateDelay(message) {
    const baseDelay = message.retryDelay;
    const attempt = message.attempt;

    switch (message.backoffType) {
        case 'fixed':
            return baseDelay;

        case 'linear':
            return baseDelay * attempt;

        case 'exponential':
            return baseDelay * Math.pow(2, attempt - 1);

        default:
            return baseDelay;
    }
}

// ===== 重傳佇列管理 =====

function addToRetryQueue(message, delay) {
    const queueItem = {
        message: message,
        scheduledTime: Date.now() + delay,
        delay: delay
    };

    retryQueue.push(queueItem);
    updateQueueDisplay();

    // 安排重傳
    setTimeout(() => {
        processRetry(message.messageId);
    }, delay);
}

function processRetry(messageId) {
    const message = pendingMessages.get(messageId);
    if (!message) return;

    // 從佇列視圖移除
    const queueIndex = retryQueue.findIndex(item => item.message.messageId === messageId);
    if (queueIndex !== -1) {
        retryQueue.splice(queueIndex, 1);
        updateQueueDisplay();
    }

    // 重新發送
    worker.postMessage({
        type: 'PROCESS_MESSAGE',
        payload: {
            messageId: message.messageId,
            content: message.content,
            attempt: message.attempt
        }
    });
}

function removeFromQueue(messageId) {
    const index = retryQueue.findIndex(item => item.message.messageId === messageId);
    if (index !== -1) {
        retryQueue.splice(index, 1);
        updateQueueDisplay();
    }
}

// ===== UI 更新 =====

function updateStats() {
    elements.totalSent.textContent = stats.totalSent;
    elements.totalSuccess.textContent = stats.totalSuccess;
    elements.totalRetries.textContent = stats.totalRetries;
    elements.totalFailed.textContent = stats.totalFailed;
}

function updateQueueDisplay() {
    if (retryQueue.length === 0) {
        elements.queueContainer.innerHTML = '<p class="empty-message">佇列為空</p>';
        return;
    }

    const html = retryQueue.map(item => {
        const timeLeft = Math.max(0, item.scheduledTime - Date.now());
        return `
            <div class="queue-item">
                <div class="queue-info">
                    <span class="queue-id">#${item.message.messageId}</span>
                    <span class="queue-content">${escapeHtml(item.message.content)}</span>
                </div>
                <div class="queue-meta">
                    <span class="queue-attempt">第 ${item.message.attempt} 次重試</span>
                    <span class="queue-time">${Math.ceil(timeLeft / 1000)}s 後</span>
                </div>
            </div>
        `;
    }).join('');

    elements.queueContainer.innerHTML = html;
}

function addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.innerHTML = `
        <span class="log-time">${timestamp}</span>
        <span class="log-icon">${getLogIcon(type)}</span>
        <span class="log-message">${escapeHtml(message)}</span>
    `;

    // 移除空訊息提示
    const emptyMessage = elements.logContainer.querySelector('.empty-message');
    if (emptyMessage) {
        emptyMessage.remove();
    }

    elements.logContainer.insertBefore(logEntry, elements.logContainer.firstChild);

    // 限制日誌數量
    while (elements.logContainer.children.length > 100) {
        elements.logContainer.removeChild(elements.logContainer.lastChild);
    }
}

function getLogIcon(type) {
    const icons = {
        info: 'ℹ️',
        send: '📤',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        retry: '🔄'
    };
    return icons[type] || '📌';
}

function clearLogs() {
    elements.logContainer.innerHTML = '<p class="empty-message">尚無訊息記錄</p>';
    elements.queueContainer.innerHTML = '<p class="empty-message">佇列為空</p>';

    // 重置統計
    stats.totalSent = 0;
    stats.totalSuccess = 0;
    stats.totalRetries = 0;
    stats.totalFailed = 0;
    updateStats();

    // 清除待處理訊息
    pendingMessages.clear();
    retryQueue.length = 0;

    addLog('info', '記錄已清除');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 定期更新佇列顯示
setInterval(updateQueueDisplay, 1000);
