/**
 * 廣播訊息 - 主執行緒腳本
 *
 * 功能：使用 BroadcastChannel API 實現一對多的訊息廣播
 * 通訊模式：One-to-Many Broadcast
 *
 * @description
 * 此腳本展示如何使用 BroadcastChannel 讓主執行緒能夠同時與多個 Worker 通訊，
 * 實現高效的一對多訊息廣播。
 */

// ===== 全域變數 =====

// BroadcastChannel 實例
let broadcastChannel = null;

// 頻道名稱
const CHANNEL_NAME = 'worker-broadcast';

// Worker 實例陣列
const workers = [];

// Worker 計數器
let workerIdCounter = 0;

// ===== DOM 元素參考 =====

const elements = {
    workerCount: null,
    createWorkersBtn: null,
    terminateAllBtn: null,
    workerList: null,
    broadcastMessage: null,
    broadcastTextBtn: null,
    broadcastPingBtn: null,
    broadcastStatusBtn: null,
    broadcastResetBtn: null,
    broadcastTaskBtn: null,
    currentChannel: null,
    logContainer: null,
    clearLogBtn: null,
    errorMessage: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeBroadcastChannel();
    log('系統', '廣播訊息系統已初始化', 'system');
});

/**
 * 初始化 DOM 元素參考
 */
function initializeElements() {
    elements.workerCount = document.getElementById('worker-count');
    elements.createWorkersBtn = document.getElementById('create-workers-btn');
    elements.terminateAllBtn = document.getElementById('terminate-all-btn');
    elements.workerList = document.getElementById('worker-list');
    elements.broadcastMessage = document.getElementById('broadcast-message');
    elements.broadcastTextBtn = document.getElementById('broadcast-text-btn');
    elements.broadcastPingBtn = document.getElementById('broadcast-ping-btn');
    elements.broadcastStatusBtn = document.getElementById('broadcast-status-btn');
    elements.broadcastResetBtn = document.getElementById('broadcast-reset-btn');
    elements.broadcastTaskBtn = document.getElementById('broadcast-task-btn');
    elements.currentChannel = document.getElementById('current-channel');
    elements.logContainer = document.getElementById('log-container');
    elements.clearLogBtn = document.getElementById('clear-log-btn');
    elements.errorMessage = document.getElementById('error-message');
}

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
    elements.createWorkersBtn.addEventListener('click', createWorkers);
    elements.terminateAllBtn.addEventListener('click', terminateAllWorkers);
    elements.broadcastTextBtn.addEventListener('click', broadcastTextMessage);
    elements.broadcastPingBtn.addEventListener('click', broadcastPing);
    elements.broadcastStatusBtn.addEventListener('click', broadcastStatusRequest);
    elements.broadcastResetBtn.addEventListener('click', broadcastReset);
    elements.broadcastTaskBtn.addEventListener('click', broadcastTask);
    elements.clearLogBtn.addEventListener('click', clearLog);
}

/**
 * 初始化 BroadcastChannel
 */
function initializeBroadcastChannel() {
    if (typeof BroadcastChannel === 'undefined') {
        showError('您的瀏覽器不支援 BroadcastChannel API');
        return;
    }

    // 建立 BroadcastChannel
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);

    // 監聽來自 Worker 的廣播訊息
    broadcastChannel.onmessage = handleBroadcastMessage;

    elements.currentChannel.textContent = CHANNEL_NAME;
    log('頻道', `已連接到頻道: ${CHANNEL_NAME}`, 'channel');
}

// ===== Worker 管理 =====

/**
 * 建立指定數量的 Worker
 */
function createWorkers() {
    const count = parseInt(elements.workerCount.value);
    if (isNaN(count) || count < 1 || count > 10) {
        showError('請輸入 1-10 之間的數量');
        return;
    }

    hideError();

    for (let i = 0; i < count; i++) {
        createWorker();
    }

    log('系統', `已建立 ${count} 個 Worker`, 'system');
}

/**
 * 建立單一 Worker
 */
function createWorker() {
    const workerId = ++workerIdCounter;

    // 建立 Worker
    const worker = new Worker('worker.js');

    // 儲存 Worker 資訊
    const workerInfo = {
        id: workerId,
        worker: worker,
        status: 'initializing',
        messageCount: 0,
        createdAt: Date.now()
    };

    // 設定訊息處理器 (用於接收直接訊息)
    worker.onmessage = (event) => handleWorkerDirectMessage(workerInfo, event);
    worker.onerror = (error) => handleWorkerError(workerInfo, error);

    // 初始化 Worker (傳送頻道名稱和 ID)
    worker.postMessage({
        type: 'INIT',
        payload: {
            workerId: workerId,
            channelName: CHANNEL_NAME
        }
    });

    workers.push(workerInfo);
    updateWorkerListUI();
}

/**
 * 終止所有 Worker
 */
function terminateAllWorkers() {
    if (workers.length === 0) {
        showError('目前沒有任何 Worker');
        return;
    }

    hideError();

    // 先廣播關閉通知
    broadcast('SHUTDOWN', { reason: '使用者終止' });

    // 終止所有 Worker
    workers.forEach(workerInfo => {
        workerInfo.worker.terminate();
    });

    const count = workers.length;
    workers.length = 0;
    updateWorkerListUI();

    log('系統', `已終止 ${count} 個 Worker`, 'warning');
}

/**
 * 終止單一 Worker
 * @param {number} workerId - Worker ID
 */
function terminateWorker(workerId) {
    const index = workers.findIndex(w => w.id === workerId);
    if (index === -1) return;

    const workerInfo = workers[index];
    workerInfo.worker.terminate();
    workers.splice(index, 1);
    updateWorkerListUI();

    log('系統', `Worker #${workerId} 已終止`, 'warning');
}

// ===== 廣播函數 =====

/**
 * 廣播訊息
 * @param {string} type - 訊息類型
 * @param {*} payload - 訊息內容
 */
function broadcast(type, payload) {
    if (!broadcastChannel) {
        showError('BroadcastChannel 尚未初始化');
        return;
    }

    const message = {
        type,
        payload,
        from: 'main',
        timestamp: Date.now()
    };

    broadcastChannel.postMessage(message);
    log('廣播', `[${type}] ${JSON.stringify(payload)}`, 'broadcast');
}

/**
 * 廣播文字訊息
 */
function broadcastTextMessage() {
    const text = elements.broadcastMessage.value.trim();
    if (!text) {
        showError('請輸入要廣播的訊息');
        return;
    }

    hideError();
    broadcast('TEXT', { message: text });
}

/**
 * 廣播 PING 測試
 */
function broadcastPing() {
    broadcast('PING', { sentAt: Date.now() });
}

/**
 * 廣播狀態請求
 */
function broadcastStatusRequest() {
    broadcast('STATUS_REQUEST', {});
}

/**
 * 廣播重置指令
 */
function broadcastReset() {
    broadcast('RESET', { resetAt: Date.now() });
}

/**
 * 廣播任務
 */
function broadcastTask() {
    const taskId = Date.now();
    broadcast('TASK', {
        taskId,
        description: '處理資料計算任務',
        data: Array.from({ length: 10 }, () => Math.floor(Math.random() * 100))
    });
}

// ===== 訊息處理 =====

/**
 * 處理來自 BroadcastChannel 的訊息
 * @param {MessageEvent} event - 訊息事件
 */
function handleBroadcastMessage(event) {
    const { type, payload, from, workerId } = event.data;

    // 更新對應 Worker 的訊息計數
    if (workerId) {
        const workerInfo = workers.find(w => w.id === workerId);
        if (workerInfo) {
            workerInfo.messageCount++;
            updateWorkerListUI();
        }
    }

    switch (type) {
        case 'PONG':
            const latency = Date.now() - payload.sentAt;
            log('回應', `Worker #${workerId} PONG (延遲: ${latency}ms)`, 'receive');
            break;

        case 'STATUS':
            log('狀態', `Worker #${workerId}: ${JSON.stringify(payload)}`, 'receive');
            break;

        case 'TASK_RESULT':
            log('結果', `Worker #${workerId} 完成任務 ${payload.taskId}: ${payload.result}`, 'success');
            break;

        case 'READY':
            log('就緒', `Worker #${workerId} 已準備就緒`, 'receive');
            // 更新 Worker 狀態
            const workerInfo = workers.find(w => w.id === workerId);
            if (workerInfo) {
                workerInfo.status = 'ready';
                updateWorkerListUI();
            }
            break;

        default:
            log('訊息', `Worker #${workerId} [${type}]: ${JSON.stringify(payload)}`, 'receive');
    }
}

/**
 * 處理 Worker 直接訊息 (非廣播)
 * @param {Object} workerInfo - Worker 資訊
 * @param {MessageEvent} event - 訊息事件
 */
function handleWorkerDirectMessage(workerInfo, event) {
    const { type, payload } = event.data;

    if (type === 'INITIALIZED') {
        workerInfo.status = 'ready';
        updateWorkerListUI();
        log('系統', `Worker #${workerInfo.id} 初始化完成`, 'system');
    }
}

/**
 * 處理 Worker 錯誤
 * @param {Object} workerInfo - Worker 資訊
 * @param {ErrorEvent} error - 錯誤事件
 */
function handleWorkerError(workerInfo, error) {
    workerInfo.status = 'error';
    updateWorkerListUI();
    log('錯誤', `Worker #${workerInfo.id} 發生錯誤: ${error.message}`, 'error');
}

// ===== UI 更新函數 =====

/**
 * 更新 Worker 列表 UI
 */
function updateWorkerListUI() {
    if (workers.length === 0) {
        elements.workerList.innerHTML = '<p class="empty-message">尚未建立任何 Worker</p>';
        return;
    }

    let html = '<div class="worker-grid">';
    workers.forEach(workerInfo => {
        const statusClass = workerInfo.status === 'ready' ? 'status-ready' :
                           workerInfo.status === 'error' ? 'status-error' : 'status-init';

        html += `
            <div class="worker-item">
                <div class="worker-header">
                    <span class="worker-id">Worker #${workerInfo.id}</span>
                    <span class="worker-status ${statusClass}">${workerInfo.status}</span>
                </div>
                <div class="worker-stats">
                    <span class="worker-stat">訊息: ${workerInfo.messageCount}</span>
                </div>
                <button class="btn btn-danger btn-small" onclick="terminateWorker(${workerInfo.id})">
                    終止
                </button>
            </div>
        `;
    });
    html += '</div>';
    elements.workerList.innerHTML = html;
}

/**
 * 添加日誌訊息
 * @param {string} type - 日誌類型
 * @param {string} message - 日誌內容
 * @param {string} className - CSS 類別名稱
 */
function log(type, message, className = '') {
    const logContainer = elements.logContainer;

    // 移除空白訊息
    const emptyMessage = logContainer.querySelector('.empty-message');
    if (emptyMessage) {
        emptyMessage.remove();
    }

    // 建立日誌項目
    const logItem = document.createElement('div');
    logItem.className = `log-item ${className}`;

    const timestamp = new Date().toLocaleTimeString();
    logItem.innerHTML = `
        <span class="log-time">${timestamp}</span>
        <span class="log-type">[${type}]</span>
        <span class="log-message">${message}</span>
    `;

    // 添加到容器頂部
    logContainer.insertBefore(logItem, logContainer.firstChild);

    // 限制日誌數量
    const maxLogs = 50;
    while (logContainer.children.length > maxLogs) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

/**
 * 清除日誌
 */
function clearLog() {
    elements.logContainer.innerHTML = '<p class="empty-message">尚無通訊記錄</p>';
}

/**
 * 顯示錯誤訊息
 * @param {string} message - 錯誤訊息
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

/**
 * 隱藏錯誤訊息
 */
function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// 將 terminateWorker 暴露到全域作用域
window.terminateWorker = terminateWorker;
