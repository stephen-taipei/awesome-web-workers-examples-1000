/**
 * 訊息過期機制 - 主執行緒腳本
 *
 * 功能：管理訊息 TTL 設定與 UI 互動
 * 通訊模式：postMessage with TTL management
 *
 * @description
 * 此腳本負責：
 * 1. 發送訊息給 Worker (含 TTL 設定)
 * 2. 即時顯示訊息狀態與剩餘時間
 * 3. 處理過期通知
 * 4. 管理使用者互動
 */

// ===== 全域變數 =====

let worker = null;
let messageIdCounter = 0;

// 統計
const stats = {
    totalSent: 0,
    activeCount: 0,
    expiringSoon: 0,
    expiredCount: 0
};

// 過期記錄
const expiredLog = [];

// ===== DOM 元素 =====

const elements = {
    defaultTTL: null,
    cleanupInterval: null,
    customTTL: null,
    messageInput: null,
    sendBtn: null,
    batchBtn: null,
    cleanupBtn: null,
    clearBtn: null,
    queueContainer: null,
    queueCount: null,
    currentTime: null,
    expiredContainer: null,
    totalSent: null,
    activeCount: null,
    expiringSoon: null,
    expiredCount: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
    startTimeUpdate();
});

function initializeElements() {
    elements.defaultTTL = document.getElementById('default-ttl');
    elements.cleanupInterval = document.getElementById('cleanup-interval');
    elements.customTTL = document.getElementById('custom-ttl');
    elements.messageInput = document.getElementById('message-input');
    elements.sendBtn = document.getElementById('send-btn');
    elements.batchBtn = document.getElementById('batch-btn');
    elements.cleanupBtn = document.getElementById('cleanup-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.queueContainer = document.getElementById('queue-container');
    elements.queueCount = document.getElementById('queue-count');
    elements.currentTime = document.getElementById('current-time');
    elements.expiredContainer = document.getElementById('expired-container');
    elements.totalSent = document.getElementById('total-sent');
    elements.activeCount = document.getElementById('active-count');
    elements.expiringSoon = document.getElementById('expiring-soon');
    elements.expiredCount = document.getElementById('expired-count');
}

function setupEventListeners() {
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.batchBtn.addEventListener('click', sendBatchMessages);
    elements.cleanupBtn.addEventListener('click', cleanupNow);
    elements.clearBtn.addEventListener('click', clearAll);

    elements.defaultTTL.addEventListener('change', updateWorkerConfig);
    elements.cleanupInterval.addEventListener('change', updateWorkerConfig);

    // TTL 快速設定按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            elements.customTTL.value = this.dataset.ttl;
        });
    });

    // Enter 鍵發送
    elements.messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;

    updateWorkerConfig();
}

function startTimeUpdate() {
    setInterval(() => {
        elements.currentTime.textContent = new Date().toLocaleTimeString();
    }, 1000);
}

// ===== Worker 通訊 =====

function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'CONFIGURED':
            console.log('Worker 配置更新:', payload);
            break;

        case 'MESSAGE_ADDED':
            stats.totalSent++;
            updateStats();
            break;

        case 'MESSAGE_REMOVED':
            break;

        case 'MESSAGES_EXPIRED':
            handleMessagesExpired(payload);
            break;

        case 'CLEANUP_COMPLETE':
            handleCleanupComplete(payload);
            break;

        case 'ALL_CLEARED':
            handleAllCleared(payload);
            break;

        case 'STATUS':
            handleStatusUpdate(payload);
            break;

        case 'ERROR':
            showError(`Worker 錯誤: ${payload.message}`);
            break;
    }
}

function handleWorkerError(error) {
    showError(`Worker 發生錯誤: ${error.message}`);
}

function updateWorkerConfig() {
    if (worker) {
        worker.postMessage({
            type: 'CONFIGURE',
            payload: {
                defaultTTL: parseInt(elements.defaultTTL.value) * 1000,
                cleanupInterval: parseInt(elements.cleanupInterval.value) * 1000
            }
        });
    }
}

// ===== 訊息發送 =====

function sendMessage() {
    const content = elements.messageInput.value.trim() || 'Message';
    const customTTL = parseInt(elements.customTTL.value);
    const messageId = `msg-${++messageIdCounter}`;

    // TTL: 0 表示永不過期，其他值為秒數
    const ttl = customTTL === 0 ? 0 : (customTTL || parseInt(elements.defaultTTL.value)) * 1000;

    worker.postMessage({
        type: 'ADD_MESSAGE',
        payload: {
            messageId,
            content,
            ttl
        }
    });
}

function sendBatchMessages() {
    const count = 5;
    const ttlOptions = [3000, 5000, 8000, 10000, 15000];

    for (let i = 0; i < count; i++) {
        const messageId = `msg-${++messageIdCounter}`;
        const content = `Batch Message #${messageIdCounter}`;
        const ttl = ttlOptions[Math.floor(Math.random() * ttlOptions.length)];

        setTimeout(() => {
            worker.postMessage({
                type: 'ADD_MESSAGE',
                payload: {
                    messageId,
                    content,
                    ttl
                }
            });
        }, i * 100);
    }
}

function cleanupNow() {
    worker.postMessage({ type: 'CLEANUP_NOW' });
}

function clearAll() {
    worker.postMessage({ type: 'CLEAR_ALL' });
    expiredLog.length = 0;
    stats.totalSent = 0;
    stats.expiredCount = 0;
    updateExpiredDisplay();
    updateStats();
}

// ===== 事件處理 =====

function handleMessagesExpired(payload) {
    const { expiredMessages, remainingCount } = payload;

    expiredMessages.forEach(msg => {
        stats.expiredCount++;
        expiredLog.unshift({
            ...msg,
            expiredAt: new Date().toLocaleTimeString()
        });
    });

    // 限制過期記錄數量
    while (expiredLog.length > 50) {
        expiredLog.pop();
    }

    updateExpiredDisplay();
    updateStats();
}

function handleCleanupComplete(payload) {
    const { cleanedCount, expiredMessages } = payload;

    if (cleanedCount > 0) {
        expiredMessages.forEach(msg => {
            stats.expiredCount++;
            expiredLog.unshift({
                ...msg,
                expiredAt: new Date().toLocaleTimeString()
            });
        });

        updateExpiredDisplay();
    }

    updateStats();
}

function handleAllCleared(payload) {
    elements.queueContainer.innerHTML = '<p class="empty-message">佇列為空</p>';
    elements.queueCount.textContent = '0';
    stats.activeCount = 0;
    stats.expiringSoon = 0;
    updateStats();
}

function handleStatusUpdate(payload) {
    const { messages, activeCount, expiringSoon } = payload;

    stats.activeCount = activeCount;
    stats.expiringSoon = expiringSoon;
    elements.queueCount.textContent = activeCount;

    updateQueueDisplay(messages);
    updateStats();
}

// ===== UI 更新 =====

function updateStats() {
    elements.totalSent.textContent = stats.totalSent;
    elements.activeCount.textContent = stats.activeCount;
    elements.expiringSoon.textContent = stats.expiringSoon;
    elements.expiredCount.textContent = stats.expiredCount;
}

function updateQueueDisplay(messages) {
    if (messages.length === 0) {
        elements.queueContainer.innerHTML = '<p class="empty-message">佇列為空</p>';
        return;
    }

    const html = messages.map(msg => {
        const remainingSeconds = msg.remainingTime !== null
            ? Math.max(0, Math.ceil(msg.remainingTime / 1000))
            : null;

        let statusClass = 'normal';
        let statusText = '';

        if (remainingSeconds === null) {
            statusClass = 'permanent';
            statusText = '永久';
        } else if (remainingSeconds <= 0) {
            statusClass = 'expired';
            statusText = '已過期';
        } else if (remainingSeconds <= 5) {
            statusClass = 'critical';
            statusText = `${remainingSeconds}s`;
        } else if (remainingSeconds <= 10) {
            statusClass = 'warning';
            statusText = `${remainingSeconds}s`;
        } else {
            statusText = `${remainingSeconds}s`;
        }

        const progressWidth = remainingSeconds !== null && msg.ttl > 0
            ? Math.max(0, (msg.remainingTime / msg.ttl) * 100)
            : 100;

        return `
            <div class="queue-item ${statusClass}">
                <div class="queue-content">
                    <span class="queue-id">${msg.messageId}</span>
                    <span class="queue-text">${escapeHtml(msg.content)}</span>
                </div>
                <div class="queue-ttl">
                    <div class="ttl-bar-wrapper">
                        <div class="ttl-bar ${statusClass}" style="width: ${progressWidth}%"></div>
                    </div>
                    <span class="ttl-text">${statusText}</span>
                </div>
            </div>
        `;
    }).join('');

    elements.queueContainer.innerHTML = html;
}

function updateExpiredDisplay() {
    if (expiredLog.length === 0) {
        elements.expiredContainer.innerHTML = '<p class="empty-message">尚無過期記錄</p>';
        return;
    }

    const html = expiredLog.slice(0, 20).map(msg => `
        <div class="expired-item">
            <span class="expired-id">${msg.messageId}</span>
            <span class="expired-content">${escapeHtml(msg.content)}</span>
            <span class="expired-time">${msg.expiredAt}</span>
            <span class="expired-ttl">TTL: ${msg.ttl / 1000}s</span>
        </div>
    `).join('');

    elements.expiredContainer.innerHTML = html;
}

function showError(message) {
    console.error(message);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
