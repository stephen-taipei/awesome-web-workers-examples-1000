/**
 * 訊息去重機制 - 主執行緒腳本
 *
 * 功能：管理訊息去重流程與 UI 互動
 * 通訊模式：postMessage with deduplication feedback
 *
 * @description
 * 此腳本負責：
 * 1. 發送訊息給 Worker 進行去重檢測
 * 2. 顯示去重結果與統計
 * 3. 視覺化快取狀態
 * 4. 處理使用者互動
 */

// ===== 全域變數 =====

let worker = null;
let messageIdCounter = 0;
let currentFilter = 'all';

// 統計
const stats = {
    totalReceived: 0,
    totalUnique: 0,
    totalDuplicates: 0
};

// 訊息記錄
const messageLog = [];

// ===== DOM 元素 =====

const elements = {
    dedupStrategy: null,
    cacheSize: null,
    duplicateRate: null,
    batchSize: null,
    messageInput: null,
    sendBtn: null,
    batchBtn: null,
    clearCacheBtn: null,
    clearBtn: null,
    cacheContainer: null,
    cacheUsage: null,
    cacheMax: null,
    cacheBar: null,
    logContainer: null,
    totalReceived: null,
    totalUnique: null,
    totalDuplicates: null,
    dedupRate: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

function initializeElements() {
    elements.dedupStrategy = document.getElementById('dedup-strategy');
    elements.cacheSize = document.getElementById('cache-size');
    elements.duplicateRate = document.getElementById('duplicate-rate');
    elements.batchSize = document.getElementById('batch-size');
    elements.messageInput = document.getElementById('message-input');
    elements.sendBtn = document.getElementById('send-btn');
    elements.batchBtn = document.getElementById('batch-btn');
    elements.clearCacheBtn = document.getElementById('clear-cache-btn');
    elements.clearBtn = document.getElementById('clear-btn');
    elements.cacheContainer = document.getElementById('cache-container');
    elements.cacheUsage = document.getElementById('cache-usage');
    elements.cacheMax = document.getElementById('cache-max');
    elements.cacheBar = document.getElementById('cache-bar');
    elements.logContainer = document.getElementById('log-container');
    elements.totalReceived = document.getElementById('total-received');
    elements.totalUnique = document.getElementById('total-unique');
    elements.totalDuplicates = document.getElementById('total-duplicates');
    elements.dedupRate = document.getElementById('dedup-rate');
}

function setupEventListeners() {
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.batchBtn.addEventListener('click', sendBatchMessages);
    elements.clearCacheBtn.addEventListener('click', clearCache);
    elements.clearBtn.addEventListener('click', clearAll);

    elements.dedupStrategy.addEventListener('change', updateWorkerConfig);
    elements.cacheSize.addEventListener('change', updateWorkerConfig);

    // 篩選按鈕
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderLog();
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
        addLog('error', '您的瀏覽器不支援 Web Workers', null);
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
            addLog('info', `配置更新：策略=${payload.strategy}, 快取大小=${payload.cacheSize}`, null);
            break;

        case 'CHECK_RESULT':
            handleCheckResult(payload);
            break;

        case 'CACHE_CLEARED':
            addLog('info', '快取已清除', null);
            updateCacheDisplay(0, parseInt(elements.cacheSize.value));
            break;

        case 'CACHE_STATUS':
            updateCacheEntries(payload);
            break;

        case 'ERROR':
            addLog('error', `Worker 錯誤: ${payload.message}`, null);
            break;
    }
}

function handleWorkerError(error) {
    addLog('error', `Worker 發生錯誤: ${error.message}`, null);
}

function updateWorkerConfig() {
    if (worker) {
        worker.postMessage({
            type: 'CONFIGURE',
            payload: {
                strategy: elements.dedupStrategy.value,
                cacheSize: parseInt(elements.cacheSize.value)
            }
        });

        elements.cacheMax.textContent = elements.cacheSize.value;
    }
}

// ===== 訊息發送 =====

function sendMessage() {
    const content = elements.messageInput.value.trim();
    if (!content) {
        addLog('warning', '請輸入訊息內容', null);
        return;
    }

    const messageId = `msg-${++messageIdCounter}-${Date.now()}`;

    worker.postMessage({
        type: 'CHECK_MESSAGE',
        payload: {
            messageId,
            content,
            timestamp: Date.now()
        }
    });
}

function sendBatchMessages() {
    const batchSize = parseInt(elements.batchSize.value);
    const duplicateRate = parseInt(elements.duplicateRate.value) / 100;

    // 產生一些基礎訊息
    const baseMessages = [
        'Hello World',
        'Web Workers are great',
        'Deduplication test',
        'Unique message',
        'Another message'
    ];

    for (let i = 0; i < batchSize; i++) {
        let content;

        if (Math.random() < duplicateRate && i > 0) {
            // 產生重複訊息
            const randomBase = baseMessages[Math.floor(Math.random() * baseMessages.length)];
            content = randomBase;
        } else {
            // 產生唯一訊息
            content = `Message ${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
        }

        const messageId = `msg-${++messageIdCounter}-${Date.now()}-${i}`;

        // 延遲發送以模擬真實場景
        setTimeout(() => {
            worker.postMessage({
                type: 'CHECK_MESSAGE',
                payload: {
                    messageId,
                    content,
                    timestamp: Date.now()
                }
            });
        }, i * 50);
    }

    addLog('info', `開始發送 ${batchSize} 則訊息 (模擬重複率: ${duplicateRate * 100}%)`, null);
}

// ===== 結果處理 =====

function handleCheckResult(payload) {
    const { messageId, content, contentHash, isDuplicate, duplicateReason, cacheStatus } = payload;

    stats.totalReceived++;

    if (isDuplicate) {
        stats.totalDuplicates++;
        addLog('duplicate', `重複訊息 [${duplicateReason}]: "${truncate(content, 40)}"`, {
            messageId,
            content,
            hash: contentHash,
            isDuplicate: true,
            reason: duplicateReason
        });
    } else {
        stats.totalUnique++;
        addLog('unique', `唯一訊息: "${truncate(content, 40)}"`, {
            messageId,
            content,
            hash: contentHash,
            isDuplicate: false
        });
    }

    updateStats();
    updateCacheDisplay(cacheStatus.hashCacheSize, cacheStatus.maxSize);

    // 更新快取顯示
    worker.postMessage({ type: 'GET_CACHE_STATUS' });
}

// ===== UI 更新 =====

function updateStats() {
    elements.totalReceived.textContent = stats.totalReceived;
    elements.totalUnique.textContent = stats.totalUnique;
    elements.totalDuplicates.textContent = stats.totalDuplicates;

    const rate = stats.totalReceived > 0
        ? Math.round((stats.totalDuplicates / stats.totalReceived) * 100)
        : 0;
    elements.dedupRate.textContent = `${rate}%`;
}

function updateCacheDisplay(used, max) {
    elements.cacheUsage.textContent = used;
    elements.cacheMax.textContent = max;

    const percentage = Math.round((used / max) * 100);
    elements.cacheBar.style.width = `${percentage}%`;
}

function updateCacheEntries(payload) {
    const { hashEntries, idEntries } = payload;

    if (hashEntries.length === 0 && idEntries.length === 0) {
        elements.cacheContainer.innerHTML = '<p class="empty-message">快取為空</p>';
        return;
    }

    let html = '';

    if (hashEntries.length > 0) {
        html += '<div class="cache-section"><h4>雜湊快取 (最近 10 筆)</h4>';
        html += hashEntries.map(entry => `
            <div class="cache-item">
                <span class="cache-hash">${entry.hash}</span>
                <span class="cache-id">${entry.messageId}</span>
            </div>
        `).join('');
        html += '</div>';
    }

    elements.cacheContainer.innerHTML = html;
}

function addLog(type, message, data) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = {
        type,
        message,
        data,
        timestamp
    };

    messageLog.unshift(entry);

    // 限制日誌數量
    if (messageLog.length > 200) {
        messageLog.pop();
    }

    renderLog();
}

function renderLog() {
    const filtered = messageLog.filter(entry => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'unique') return entry.type === 'unique';
        if (currentFilter === 'duplicate') return entry.type === 'duplicate';
        return true;
    });

    if (filtered.length === 0) {
        elements.logContainer.innerHTML = '<p class="empty-message">尚無訊息記錄</p>';
        return;
    }

    const html = filtered.slice(0, 50).map(entry => `
        <div class="log-entry log-${entry.type}">
            <span class="log-time">${entry.timestamp}</span>
            <span class="log-icon">${getLogIcon(entry.type)}</span>
            <span class="log-message">${escapeHtml(entry.message)}</span>
            ${entry.data && entry.data.hash ? `<span class="log-hash" title="${entry.data.hash}">${entry.data.hash.substring(0, 8)}...</span>` : ''}
        </div>
    `).join('');

    elements.logContainer.innerHTML = html;
}

function getLogIcon(type) {
    const icons = {
        info: 'ℹ️',
        unique: '✅',
        duplicate: '🔄',
        warning: '⚠️',
        error: '❌'
    };
    return icons[type] || '📌';
}

function clearCache() {
    worker.postMessage({ type: 'CLEAR_CACHE' });
}

function clearAll() {
    clearCache();

    stats.totalReceived = 0;
    stats.totalUnique = 0;
    stats.totalDuplicates = 0;
    messageLog.length = 0;
    messageIdCounter = 0;

    updateStats();
    elements.logContainer.innerHTML = '<p class="empty-message">尚無訊息記錄</p>';
    elements.cacheContainer.innerHTML = '<p class="empty-message">快取為空</p>';

    addLog('info', '已重置全部', null);
}

function truncate(str, length) {
    return str.length > length ? str.substring(0, length) + '...' : str;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
