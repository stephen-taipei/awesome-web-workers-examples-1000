/**
 * 發布訂閱 - 主執行緒腳本
 *
 * 功能：實現發布訂閱模式的訊息代理
 * 設計模式：Publish/Subscribe Pattern
 *
 * @description
 * 此腳本作為訊息代理 (Message Broker)，管理主題訂閱和訊息分發，
 * 讓 Worker 之間能夠透過主題進行解耦通訊。
 */

// ===== 全域變數 =====

// Worker 實例陣列
const workers = [];

// Worker 計數器
let workerIdCounter = 0;

// 主題訂閱管理 (topic -> Set of workerIds)
const subscriptions = new Map();

// 可用主題列表
const topics = new Set(['news', 'alerts', 'tasks', 'system.status', 'system.config', 'data.update']);

// ===== DOM 元素參考 =====

const elements = {
    workerCount: null,
    createWorkersBtn: null,
    terminateAllBtn: null,
    workerList: null,
    topicList: null,
    customTopic: null,
    addTopicBtn: null,
    workerSelect: null,
    topicSelect: null,
    subscribeBtn: null,
    unsubscribeBtn: null,
    publishTopic: null,
    publishMessage: null,
    publishBtn: null,
    logContainer: null,
    clearLogBtn: null,
    errorMessage: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    updateTopicSelects();
    log('系統', '發布訂閱系統已初始化', 'system');
});

/**
 * 初始化 DOM 元素參考
 */
function initializeElements() {
    elements.workerCount = document.getElementById('worker-count');
    elements.createWorkersBtn = document.getElementById('create-workers-btn');
    elements.terminateAllBtn = document.getElementById('terminate-all-btn');
    elements.workerList = document.getElementById('worker-list');
    elements.topicList = document.getElementById('topic-list');
    elements.customTopic = document.getElementById('custom-topic');
    elements.addTopicBtn = document.getElementById('add-topic-btn');
    elements.workerSelect = document.getElementById('worker-select');
    elements.topicSelect = document.getElementById('topic-select');
    elements.subscribeBtn = document.getElementById('subscribe-btn');
    elements.unsubscribeBtn = document.getElementById('unsubscribe-btn');
    elements.publishTopic = document.getElementById('publish-topic');
    elements.publishMessage = document.getElementById('publish-message');
    elements.publishBtn = document.getElementById('publish-btn');
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
    elements.addTopicBtn.addEventListener('click', addCustomTopic);
    elements.subscribeBtn.addEventListener('click', subscribeWorkerToTopic);
    elements.unsubscribeBtn.addEventListener('click', unsubscribeWorkerFromTopic);
    elements.publishBtn.addEventListener('click', publishMessage);
    elements.clearLogBtn.addEventListener('click', clearLog);

    // 快速發布按鈕
    document.querySelectorAll('.quick-publish').forEach(btn => {
        btn.addEventListener('click', function() {
            const topic = this.dataset.topic;
            const message = this.dataset.message;
            publish(topic, { message, timestamp: Date.now() });
        });
    });

    // 主題標籤點擊
    elements.topicList.addEventListener('click', function(e) {
        if (e.target.classList.contains('topic-tag')) {
            const topic = e.target.dataset.topic;
            elements.publishTopic.value = topic;
        }
    });
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

    updateWorkerSelect();
    log('系統', `已建立 ${count} 個 Worker`, 'system');
}

/**
 * 建立單一 Worker
 */
function createWorker() {
    const workerId = ++workerIdCounter;

    const worker = new Worker('worker.js');

    const workerInfo = {
        id: workerId,
        worker: worker,
        status: 'ready',
        subscriptions: new Set(),
        messageCount: 0
    };

    worker.onmessage = (event) => handleWorkerMessage(workerInfo, event);
    worker.onerror = (error) => handleWorkerError(workerInfo, error);

    // 初始化 Worker
    worker.postMessage({
        type: 'INIT',
        payload: { workerId }
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

    workers.forEach(workerInfo => {
        workerInfo.worker.terminate();
    });

    const count = workers.length;
    workers.length = 0;

    // 清除所有訂閱
    subscriptions.clear();

    updateWorkerListUI();
    updateWorkerSelect();

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

    // 從所有主題中移除此 Worker 的訂閱
    workerInfo.subscriptions.forEach(topic => {
        const subscribers = subscriptions.get(topic);
        if (subscribers) {
            subscribers.delete(workerId);
        }
    });

    workerInfo.worker.terminate();
    workers.splice(index, 1);

    updateWorkerListUI();
    updateWorkerSelect();

    log('系統', `Worker #${workerId} 已終止`, 'warning');
}

// ===== 主題管理 =====

/**
 * 新增自訂主題
 */
function addCustomTopic() {
    const topic = elements.customTopic.value.trim();
    if (!topic) {
        showError('請輸入主題名稱');
        return;
    }

    if (topics.has(topic)) {
        showError('此主題已存在');
        return;
    }

    // 驗證主題名稱格式
    if (!/^[\w.]+$/.test(topic)) {
        showError('主題名稱只能包含英文字母、數字、底線和點');
        return;
    }

    hideError();
    topics.add(topic);

    // 更新主題列表 UI
    const tag = document.createElement('span');
    tag.className = 'topic-tag';
    tag.dataset.topic = topic;
    tag.textContent = topic;
    elements.topicList.appendChild(tag);

    // 更新下拉選單
    updateTopicSelects();

    elements.customTopic.value = '';
    log('主題', `新增主題: ${topic}`, 'topic');
}

/**
 * 更新主題下拉選單
 */
function updateTopicSelects() {
    const topicOptions = ['<option value="">選擇主題...</option>'];
    topics.forEach(topic => {
        topicOptions.push(`<option value="${topic}">${topic}</option>`);
    });

    elements.topicSelect.innerHTML = topicOptions.join('');
    elements.publishTopic.innerHTML = topicOptions.join('');
}

// ===== 訂閱管理 =====

/**
 * 訂閱 Worker 到主題
 */
function subscribeWorkerToTopic() {
    const workerId = parseInt(elements.workerSelect.value);
    const topic = elements.topicSelect.value;

    if (!workerId) {
        showError('請選擇 Worker');
        return;
    }

    if (!topic) {
        showError('請選擇主題');
        return;
    }

    hideError();

    const workerInfo = workers.find(w => w.id === workerId);
    if (!workerInfo) {
        showError('找不到指定的 Worker');
        return;
    }

    // 檢查是否已訂閱
    if (workerInfo.subscriptions.has(topic)) {
        showError(`Worker #${workerId} 已訂閱主題 ${topic}`);
        return;
    }

    // 更新訂閱資訊
    workerInfo.subscriptions.add(topic);

    if (!subscriptions.has(topic)) {
        subscriptions.set(topic, new Set());
    }
    subscriptions.get(topic).add(workerId);

    // 通知 Worker
    workerInfo.worker.postMessage({
        type: 'SUBSCRIBE',
        payload: { topic }
    });

    updateWorkerListUI();
    log('訂閱', `Worker #${workerId} 訂閱了 ${topic}`, 'subscribe');
}

/**
 * 取消 Worker 的主題訂閱
 */
function unsubscribeWorkerFromTopic() {
    const workerId = parseInt(elements.workerSelect.value);
    const topic = elements.topicSelect.value;

    if (!workerId) {
        showError('請選擇 Worker');
        return;
    }

    if (!topic) {
        showError('請選擇主題');
        return;
    }

    hideError();

    const workerInfo = workers.find(w => w.id === workerId);
    if (!workerInfo) {
        showError('找不到指定的 Worker');
        return;
    }

    // 檢查是否有訂閱
    if (!workerInfo.subscriptions.has(topic)) {
        showError(`Worker #${workerId} 未訂閱主題 ${topic}`);
        return;
    }

    // 更新訂閱資訊
    workerInfo.subscriptions.delete(topic);

    const subscribers = subscriptions.get(topic);
    if (subscribers) {
        subscribers.delete(workerId);
    }

    // 通知 Worker
    workerInfo.worker.postMessage({
        type: 'UNSUBSCRIBE',
        payload: { topic }
    });

    updateWorkerListUI();
    log('取消訂閱', `Worker #${workerId} 取消訂閱 ${topic}`, 'unsubscribe');
}

// ===== 發布訊息 =====

/**
 * 發布訊息到主題
 */
function publishMessage() {
    const topic = elements.publishTopic.value;
    const message = elements.publishMessage.value.trim();

    if (!topic) {
        showError('請選擇主題');
        return;
    }

    if (!message) {
        showError('請輸入訊息內容');
        return;
    }

    hideError();
    publish(topic, { message, timestamp: Date.now() });
}

/**
 * 發布訊息到指定主題
 * @param {string} topic - 主題名稱
 * @param {*} payload - 訊息內容
 */
function publish(topic, payload) {
    // 找出所有訂閱此主題的 Worker (包含萬用字元匹配)
    const subscribers = findSubscribers(topic);

    if (subscribers.size === 0) {
        log('發布', `[${topic}] 無訂閱者 - ${JSON.stringify(payload)}`, 'publish-no-sub');
        return;
    }

    // 發送訊息給所有訂閱者
    let sentCount = 0;
    subscribers.forEach(workerId => {
        const workerInfo = workers.find(w => w.id === workerId);
        if (workerInfo) {
            workerInfo.worker.postMessage({
                type: 'MESSAGE',
                payload: {
                    topic,
                    data: payload,
                    publishedAt: Date.now()
                }
            });
            sentCount++;
        }
    });

    log('發布', `[${topic}] 發送給 ${sentCount} 個訂閱者 - ${payload.message}`, 'publish');
}

/**
 * 找出所有訂閱指定主題的 Worker (支援萬用字元)
 * @param {string} topic - 主題名稱
 * @returns {Set} 訂閱者 ID 集合
 */
function findSubscribers(topic) {
    const result = new Set();

    // 直接訂閱
    const directSubscribers = subscriptions.get(topic);
    if (directSubscribers) {
        directSubscribers.forEach(id => result.add(id));
    }

    // 萬用字元匹配 (如 system.* 匹配 system.status)
    subscriptions.forEach((subscribers, subscribedTopic) => {
        if (subscribedTopic.endsWith('.*')) {
            const prefix = subscribedTopic.slice(0, -1);
            if (topic.startsWith(prefix)) {
                subscribers.forEach(id => result.add(id));
            }
        }
    });

    return result;
}

// ===== 訊息處理 =====

/**
 * 處理來自 Worker 的訊息
 * @param {Object} workerInfo - Worker 資訊
 * @param {MessageEvent} event - 訊息事件
 */
function handleWorkerMessage(workerInfo, event) {
    const { type, payload } = event.data;

    workerInfo.messageCount++;
    updateWorkerListUI();

    switch (type) {
        case 'RECEIVED':
            log('接收', `Worker #${workerInfo.id} 收到 [${payload.topic}]: ${payload.data.message}`, 'receive');
            break;

        case 'PUBLISH':
            // Worker 發布訊息 (Worker 間通訊)
            publish(payload.topic, payload.data);
            break;

        default:
            log('訊息', `Worker #${workerInfo.id} [${type}]: ${JSON.stringify(payload)}`, 'receive');
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
 * 更新 Worker 選擇下拉選單
 */
function updateWorkerSelect() {
    const options = ['<option value="">選擇 Worker...</option>'];
    workers.forEach(w => {
        options.push(`<option value="${w.id}">Worker #${w.id}</option>`);
    });
    elements.workerSelect.innerHTML = options.join('');
}

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
        const subscriptionList = Array.from(workerInfo.subscriptions).join(', ') || '無';
        const statusClass = workerInfo.status === 'ready' ? 'status-ready' : 'status-error';

        html += `
            <div class="worker-item">
                <div class="worker-header">
                    <span class="worker-id">Worker #${workerInfo.id}</span>
                    <span class="worker-status ${statusClass}">${workerInfo.status}</span>
                </div>
                <div class="worker-stats">
                    <span class="worker-stat">訊息: ${workerInfo.messageCount}</span>
                    <span class="worker-stat">訂閱: ${workerInfo.subscriptions.size}</span>
                </div>
                <div class="worker-subscriptions">
                    <span class="subscription-label">主題:</span>
                    <span class="subscription-list">${subscriptionList}</span>
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

    const emptyMessage = logContainer.querySelector('.empty-message');
    if (emptyMessage) {
        emptyMessage.remove();
    }

    const logItem = document.createElement('div');
    logItem.className = `log-item ${className}`;

    const timestamp = new Date().toLocaleTimeString();
    logItem.innerHTML = `
        <span class="log-time">${timestamp}</span>
        <span class="log-type">[${type}]</span>
        <span class="log-message">${message}</span>
    `;

    logContainer.insertBefore(logItem, logContainer.firstChild);

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
