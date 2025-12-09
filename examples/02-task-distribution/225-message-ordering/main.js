/**
 * 訊息排序機制 - 主執行緒腳本
 *
 * 功能：實作訊息排序邏輯，確保亂序到達的訊息能按正確順序處理
 * 通訊模式：postMessage with sequence-based ordering
 *
 * @description
 * 此腳本負責：
 * 1. 管理訊息序號
 * 2. 維護排序緩衝區
 * 3. 按序號順序處理訊息
 * 4. 視覺化展示排序過程
 */

// ===== 全域變數 =====

let worker = null;
let sequenceCounter = 0;
let expectedSequence = 1;

// 排序緩衝區 (用於暫存提前到達的訊息)
const orderBuffer = new Map();

// 統計
const stats = {
    totalSent: 0,
    totalReceived: 0,
    totalProcessed: 0
};

// 接收與處理順序記錄
const receivedOrder = [];
const processedOrder = [];

// ===== DOM 元素 =====

const elements = {
    messageCount: null,
    processingMode: null,
    minDelay: null,
    maxDelay: null,
    sendBtn: null,
    clearBtn: null,
    receivedOrderDisplay: null,
    processedOrderDisplay: null,
    bufferContainer: null,
    expectedSeq: null,
    logContainer: null,
    totalSent: null,
    totalReceived: null,
    totalProcessed: null,
    waitingCount: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.messageCount = document.getElementById('message-count');
    elements.processingMode = document.getElementById('processing-mode');
    elements.minDelay = document.getElementById('min-delay');
    elements.maxDelay = document.getElementById('max-delay');
    elements.sendBtn = document.getElementById('send-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.receivedOrderDisplay = document.getElementById('received-order');
    elements.processedOrderDisplay = document.getElementById('processed-order');
    elements.bufferContainer = document.getElementById('buffer-container');
    elements.expectedSeq = document.getElementById('expected-seq');
    elements.logContainer = document.getElementById('log-container');
    elements.totalSent = document.getElementById('total-sent');
    elements.totalReceived = document.getElementById('total-received');
    elements.totalProcessed = document.getElementById('total-processed');
    elements.waitingCount = document.getElementById('waiting-count');
}

function setupEventListeners() {
    elements.sendBtn.addEventListener('click', sendBatchMessages);
    elements.clearBtn.addEventListener('click', clearAll);
    elements.processingMode.addEventListener('change', updateWorkerConfig);
    elements.minDelay.addEventListener('change', updateWorkerConfig);
    elements.maxDelay.addEventListener('change', updateWorkerConfig);
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        addLog('error', '您的瀏覽器不支援 Web Workers');
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;

    updateWorkerConfig();
}

// ===== Worker 通訊 =====

function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'CONFIGURED':
            addLog('info', `Worker 配置更新：模式=${payload.mode}, 延遲=${payload.minDelay}-${payload.maxDelay}ms`);
            break;

        case 'BATCH_STARTED':
            addLog('info', `開始處理 ${payload.count} 則訊息`);
            break;

        case 'MESSAGE_PROCESSED':
            handleMessageReceived(payload);
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
                mode: elements.processingMode.value,
                minDelay: parseInt(elements.minDelay.value),
                maxDelay: parseInt(elements.maxDelay.value)
            }
        });
    }
}

// ===== 訊息發送 =====

function sendBatchMessages() {
    const count = parseInt(elements.messageCount.value);

    // 重置序號和期望值
    sequenceCounter = 0;
    expectedSequence = 1;
    orderBuffer.clear();
    receivedOrder.length = 0;
    processedOrder.length = 0;

    // 更新顯示
    elements.receivedOrderDisplay.innerHTML = '';
    elements.processedOrderDisplay.innerHTML = '';
    updateBufferDisplay();
    elements.expectedSeq.textContent = expectedSequence;

    const messages = [];

    for (let i = 0; i < count; i++) {
        const seq = ++sequenceCounter;
        messages.push({
            sequenceNumber: seq,
            content: `訊息 #${seq}`,
            timestamp: Date.now()
        });
    }

    stats.totalSent = count;
    stats.totalReceived = 0;
    stats.totalProcessed = 0;
    updateStats();

    worker.postMessage({
        type: 'BATCH_PROCESS',
        payload: { messages }
    });

    addLog('send', `發送 ${count} 則訊息`);
}

// ===== 訊息排序處理 =====

function handleMessageReceived(payload) {
    const { sequenceNumber, content } = payload;

    stats.totalReceived++;

    // 記錄接收順序
    receivedOrder.push(sequenceNumber);
    updateReceivedDisplay(sequenceNumber);

    addLog('receive', `接收訊息 #${sequenceNumber} (接收順序: ${stats.totalReceived})`);

    // 檢查是否為期望的序號
    if (sequenceNumber === expectedSequence) {
        // 直接處理
        processMessage(payload);

        // 處理緩衝區中連續的訊息
        processBufferedMessages();
    } else if (sequenceNumber > expectedSequence) {
        // 訊息提前到達，放入緩衝區
        orderBuffer.set(sequenceNumber, payload);
        addLog('buffer', `訊息 #${sequenceNumber} 放入緩衝區 (等待 #${expectedSequence})`);
        updateBufferDisplay();
    } else {
        // 序號小於期望值（可能是重複訊息）
        addLog('warning', `訊息 #${sequenceNumber} 已過時，被丟棄`);
    }

    updateStats();
}

function processMessage(payload) {
    const { sequenceNumber, content } = payload;

    stats.totalProcessed++;
    expectedSequence++;

    // 記錄處理順序
    processedOrder.push(sequenceNumber);
    updateProcessedDisplay(sequenceNumber);

    elements.expectedSeq.textContent = expectedSequence;

    addLog('success', `處理訊息 #${sequenceNumber} (處理順序: ${stats.totalProcessed})`);
}

function processBufferedMessages() {
    // 持續處理緩衝區中連續的訊息
    while (orderBuffer.has(expectedSequence)) {
        const payload = orderBuffer.get(expectedSequence);
        orderBuffer.delete(expectedSequence);

        addLog('buffer', `從緩衝區取出訊息 #${expectedSequence}`);
        processMessage(payload);
        updateBufferDisplay();
    }
}

// ===== UI 更新 =====

function updateStats() {
    elements.totalSent.textContent = stats.totalSent;
    elements.totalReceived.textContent = stats.totalReceived;
    elements.totalProcessed.textContent = stats.totalProcessed;
    elements.waitingCount.textContent = orderBuffer.size;
}

function updateReceivedDisplay(seq) {
    const badge = document.createElement('span');
    badge.className = 'order-badge received';
    badge.textContent = seq;

    // 移除空訊息提示
    const emptyMsg = elements.receivedOrderDisplay.querySelector('.empty-message');
    if (emptyMsg) emptyMsg.remove();

    elements.receivedOrderDisplay.appendChild(badge);
}

function updateProcessedDisplay(seq) {
    const badge = document.createElement('span');
    badge.className = 'order-badge processed';
    badge.textContent = seq;

    // 移除空訊息提示
    const emptyMsg = elements.processedOrderDisplay.querySelector('.empty-message');
    if (emptyMsg) emptyMsg.remove();

    elements.processedOrderDisplay.appendChild(badge);
}

function updateBufferDisplay() {
    if (orderBuffer.size === 0) {
        elements.bufferContainer.innerHTML = '<p class="empty-message">緩衝區為空</p>';
        return;
    }

    // 取得排序後的序號
    const sortedKeys = Array.from(orderBuffer.keys()).sort((a, b) => a - b);

    const html = sortedKeys.map(seq => {
        const payload = orderBuffer.get(seq);
        return `
            <div class="buffer-item">
                <span class="buffer-seq">#${seq}</span>
                <span class="buffer-status">等待 #${expectedSequence}</span>
            </div>
        `;
    }).join('');

    elements.bufferContainer.innerHTML = html;
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

    const emptyMsg = elements.logContainer.querySelector('.empty-message');
    if (emptyMsg) emptyMsg.remove();

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
        receive: '📥',
        success: '✅',
        warning: '⚠️',
        error: '❌',
        buffer: '📦'
    };
    return icons[type] || '📌';
}

function clearAll() {
    // 重置狀態
    sequenceCounter = 0;
    expectedSequence = 1;
    orderBuffer.clear();
    receivedOrder.length = 0;
    processedOrder.length = 0;

    stats.totalSent = 0;
    stats.totalReceived = 0;
    stats.totalProcessed = 0;

    // 更新 UI
    elements.receivedOrderDisplay.innerHTML = '<p class="empty-message">等待訊息...</p>';
    elements.processedOrderDisplay.innerHTML = '<p class="empty-message">等待處理...</p>';
    elements.bufferContainer.innerHTML = '<p class="empty-message">緩衝區為空</p>';
    elements.logContainer.innerHTML = '<p class="empty-message">尚無訊息記錄</p>';
    elements.expectedSeq.textContent = '1';

    updateStats();
    addLog('info', '記錄已清除');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
