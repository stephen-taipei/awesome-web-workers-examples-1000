/**
 * 雙向通訊 - 主執行緒腳本
 *
 * 功能：使用 Promise 包裝器實現請求-回應通訊模式
 * 通訊模式：Request-Response Pattern
 *
 * @description
 * 此腳本展示如何建立一個基於 Promise 的 Worker 通訊層，
 * 讓每個請求都能獨立等待對應的回應，支援並行請求與超時處理。
 */

// ===== 全域變數 =====

// Web Worker 實例
let worker = null;

// 待處理請求的 Map (requestId -> { resolve, reject, timeout })
const pendingRequests = new Map();

// 請求計數器 (用於生成唯一 ID)
let requestIdCounter = 0;

// 預設超時時間 (毫秒)
const DEFAULT_TIMEOUT = 3000;

// ===== DOM 元素參考 =====

const elements = {
    squareInput: null,
    squareBtn: null,
    delayInput: null,
    delayBtn: null,
    batchInput: null,
    batchBtn: null,
    timeoutBtn: null,
    pendingRequests: null,
    logContainer: null,
    clearLogBtn: null,
    errorMessage: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
    log('系統', '雙向通訊系統已初始化');
});

/**
 * 初始化 DOM 元素參考
 */
function initializeElements() {
    elements.squareInput = document.getElementById('square-input');
    elements.squareBtn = document.getElementById('square-btn');
    elements.delayInput = document.getElementById('delay-input');
    elements.delayBtn = document.getElementById('delay-btn');
    elements.batchInput = document.getElementById('batch-input');
    elements.batchBtn = document.getElementById('batch-btn');
    elements.timeoutBtn = document.getElementById('timeout-btn');
    elements.pendingRequests = document.getElementById('pending-requests');
    elements.logContainer = document.getElementById('log-container');
    elements.clearLogBtn = document.getElementById('clear-log-btn');
    elements.errorMessage = document.getElementById('error-message');
}

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
    elements.squareBtn.addEventListener('click', handleSquareRequest);
    elements.delayBtn.addEventListener('click', handleDelayRequest);
    elements.batchBtn.addEventListener('click', handleBatchRequest);
    elements.timeoutBtn.addEventListener('click', handleTimeoutRequest);
    elements.clearLogBtn.addEventListener('click', clearLog);
}

/**
 * 初始化 Web Worker
 */
function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
}

// ===== Promise 包裝器 =====

/**
 * 發送請求給 Worker 並返回 Promise
 * @param {string} action - 請求動作
 * @param {*} data - 請求資料
 * @param {number} timeout - 超時時間 (毫秒)
 * @returns {Promise} 請求結果的 Promise
 */
function sendRequest(action, data, timeout = DEFAULT_TIMEOUT) {
    return new Promise((resolve, reject) => {
        // 生成唯一請求 ID
        const requestId = ++requestIdCounter;

        // 設定超時計時器
        const timeoutId = setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);
                updatePendingRequestsUI();
                reject(new Error(`請求超時 (ID: ${requestId})`));
            }
        }, timeout);

        // 儲存待處理請求
        pendingRequests.set(requestId, {
            resolve,
            reject,
            timeoutId,
            action,
            startTime: Date.now()
        });

        // 更新 UI
        updatePendingRequestsUI();

        // 發送訊息給 Worker
        worker.postMessage({
            requestId,
            action,
            data
        });

        log('發送', `請求 #${requestId}: ${action}`, 'send');
    });
}

// ===== Worker 通訊 =====

/**
 * 處理來自 Worker 的訊息
 * @param {MessageEvent} event - 訊息事件
 */
function handleWorkerMessage(event) {
    const { requestId, success, data, error } = event.data;

    // 查找對應的待處理請求
    const pendingRequest = pendingRequests.get(requestId);
    if (!pendingRequest) {
        log('警告', `收到未知請求的回應: #${requestId}`, 'warning');
        return;
    }

    // 清除超時計時器
    clearTimeout(pendingRequest.timeoutId);

    // 計算請求耗時
    const duration = Date.now() - pendingRequest.startTime;

    // 移除待處理請求
    pendingRequests.delete(requestId);
    updatePendingRequestsUI();

    // 處理回應
    if (success) {
        log('接收', `回應 #${requestId}: ${JSON.stringify(data)} (${duration}ms)`, 'receive');
        pendingRequest.resolve(data);
    } else {
        log('錯誤', `請求 #${requestId} 失敗: ${error}`, 'error');
        pendingRequest.reject(new Error(error));
    }
}

/**
 * 處理 Worker 錯誤
 * @param {ErrorEvent} error - 錯誤事件
 */
function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
    log('錯誤', `Worker 發生錯誤: ${error.message}`, 'error');

    // 拒絕所有待處理請求
    for (const [requestId, request] of pendingRequests) {
        clearTimeout(request.timeoutId);
        request.reject(new Error('Worker 錯誤'));
    }
    pendingRequests.clear();
    updatePendingRequestsUI();

    // 重新建立 Worker
    if (worker) {
        worker.terminate();
    }
    initializeWorker();
}

// ===== 請求處理函數 =====

/**
 * 處理計算平方請求
 */
async function handleSquareRequest() {
    const num = parseInt(elements.squareInput.value);
    if (isNaN(num)) {
        showError('請輸入有效數字');
        return;
    }

    hideError();
    try {
        const result = await sendRequest('SQUARE', { number: num });
        log('結果', `${num} 的平方 = ${result.result}`, 'success');
    } catch (error) {
        log('錯誤', error.message, 'error');
    }
}

/**
 * 處理延遲請求
 */
async function handleDelayRequest() {
    const delay = parseInt(elements.delayInput.value);
    if (isNaN(delay) || delay < 100 || delay > 10000) {
        showError('請輸入 100-10000 之間的延遲時間');
        return;
    }

    hideError();
    try {
        // 設定較長的超時時間
        const result = await sendRequest('DELAYED_RESPONSE', { delay }, delay + 5000);
        log('結果', `延遲請求完成: ${result.message}`, 'success');
    } catch (error) {
        log('錯誤', error.message, 'error');
    }
}

/**
 * 處理批量請求
 */
async function handleBatchRequest() {
    const count = parseInt(elements.batchInput.value);
    if (isNaN(count) || count < 1 || count > 20) {
        showError('請輸入 1-20 之間的數量');
        return;
    }

    hideError();
    log('系統', `開始發送 ${count} 個並行請求...`, 'info');

    // 同時發送多個請求
    const promises = [];
    for (let i = 1; i <= count; i++) {
        promises.push(
            sendRequest('SQUARE', { number: i })
                .then(result => ({ success: true, num: i, result: result.result }))
                .catch(error => ({ success: false, num: i, error: error.message }))
        );
    }

    // 等待所有請求完成
    const results = await Promise.all(promises);

    // 顯示統計結果
    const successCount = results.filter(r => r.success).length;
    log('結果', `批量請求完成: ${successCount}/${count} 成功`, 'success');
}

/**
 * 處理超時測試請求
 */
async function handleTimeoutRequest() {
    hideError();
    log('系統', '發送會超時的請求 (延遲 5 秒，超時 3 秒)...', 'info');

    try {
        // 請求延遲 5 秒，但超時設定為 3 秒
        await sendRequest('DELAYED_RESPONSE', { delay: 5000 }, 3000);
        log('結果', '請求完成 (不應該看到這個)', 'success');
    } catch (error) {
        log('超時', error.message, 'timeout');
    }
}

// ===== UI 更新函數 =====

/**
 * 更新待處理請求列表 UI
 */
function updatePendingRequestsUI() {
    if (pendingRequests.size === 0) {
        elements.pendingRequests.innerHTML = '<p class="empty-message">目前沒有待處理的請求</p>';
        return;
    }

    let html = '';
    for (const [requestId, request] of pendingRequests) {
        const elapsed = Date.now() - request.startTime;
        html += `
            <div class="pending-item">
                <span class="pending-id">#${requestId}</span>
                <span class="pending-action">${request.action}</span>
                <span class="pending-time">${elapsed}ms</span>
                <span class="pending-status">等待中...</span>
            </div>
        `;
    }
    elements.pendingRequests.innerHTML = html;
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

// 定期更新待處理請求的耗時顯示
setInterval(updatePendingRequestsUI, 100);
