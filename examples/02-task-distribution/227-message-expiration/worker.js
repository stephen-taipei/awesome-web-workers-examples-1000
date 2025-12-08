/**
 * 訊息過期機制 Web Worker
 *
 * 功能：管理訊息 TTL，定期檢查並清理過期訊息
 * 通訊模式：postMessage with TTL management
 *
 * @description
 * 此 Worker 負責：
 * 1. 儲存訊息與其過期時間
 * 2. 定期檢查過期訊息
 * 3. 自動清理過期訊息
 * 4. 回報訊息狀態變更
 */

// ===== 配置 =====

let config = {
    defaultTTL: 10000,      // 預設 TTL (毫秒)
    cleanupInterval: 1000   // 清理間隔 (毫秒)
};

// ===== 訊息儲存 =====

const messages = new Map();  // messageId -> { content, createdAt, expiresAt, ttl }

// 清理計時器
let cleanupTimer = null;

// ===== 訊息處理 =====

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'CONFIGURE':
            handleConfigure(payload);
            break;

        case 'ADD_MESSAGE':
            handleAddMessage(payload);
            break;

        case 'REMOVE_MESSAGE':
            handleRemoveMessage(payload);
            break;

        case 'CLEANUP_NOW':
            handleCleanupNow();
            break;

        case 'CLEAR_ALL':
            handleClearAll();
            break;

        case 'GET_STATUS':
            handleGetStatus();
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

/**
 * 處理配置更新
 */
function handleConfigure(payload) {
    if (payload.defaultTTL !== undefined) {
        config.defaultTTL = payload.defaultTTL;
    }
    if (payload.cleanupInterval !== undefined) {
        config.cleanupInterval = payload.cleanupInterval;

        // 重新設定清理計時器
        if (cleanupTimer) {
            clearInterval(cleanupTimer);
        }
        startCleanupTimer();
    }

    self.postMessage({
        type: 'CONFIGURED',
        payload: config
    });
}

/**
 * 新增訊息
 */
function handleAddMessage(payload) {
    const { messageId, content, ttl } = payload;
    const now = Date.now();

    // TTL 為 0 或 null 表示永不過期
    const actualTTL = ttl !== undefined && ttl !== null ? ttl : config.defaultTTL;
    const expiresAt = actualTTL > 0 ? now + actualTTL : null;

    const message = {
        messageId,
        content,
        createdAt: now,
        expiresAt,
        ttl: actualTTL
    };

    messages.set(messageId, message);

    self.postMessage({
        type: 'MESSAGE_ADDED',
        payload: {
            ...message,
            remainingTime: expiresAt ? expiresAt - now : null
        }
    });

    // 確保清理計時器在運行
    if (!cleanupTimer) {
        startCleanupTimer();
    }
}

/**
 * 移除訊息
 */
function handleRemoveMessage(payload) {
    const { messageId } = payload;

    if (messages.has(messageId)) {
        messages.delete(messageId);

        self.postMessage({
            type: 'MESSAGE_REMOVED',
            payload: { messageId, reason: 'manual' }
        });
    }
}

/**
 * 立即清理過期訊息
 */
function handleCleanupNow() {
    const expired = cleanupExpiredMessages();

    self.postMessage({
        type: 'CLEANUP_COMPLETE',
        payload: {
            cleanedCount: expired.length,
            expiredMessages: expired,
            remainingCount: messages.size
        }
    });
}

/**
 * 清除所有訊息
 */
function handleClearAll() {
    const count = messages.size;
    messages.clear();

    self.postMessage({
        type: 'ALL_CLEARED',
        payload: { clearedCount: count }
    });
}

/**
 * 取得當前狀態
 */
function handleGetStatus() {
    const now = Date.now();
    const messageList = [];
    let expiringSoon = 0;

    messages.forEach((msg, id) => {
        const remainingTime = msg.expiresAt ? msg.expiresAt - now : null;

        // 即將過期 (剩餘時間 < 5 秒)
        if (remainingTime !== null && remainingTime > 0 && remainingTime < 5000) {
            expiringSoon++;
        }

        messageList.push({
            ...msg,
            remainingTime
        });
    });

    // 按剩餘時間排序 (永不過期的放最後)
    messageList.sort((a, b) => {
        if (a.remainingTime === null) return 1;
        if (b.remainingTime === null) return -1;
        return a.remainingTime - b.remainingTime;
    });

    self.postMessage({
        type: 'STATUS',
        payload: {
            messages: messageList,
            activeCount: messages.size,
            expiringSoon,
            currentTime: now
        }
    });
}

// ===== 清理邏輯 =====

/**
 * 啟動清理計時器
 */
function startCleanupTimer() {
    cleanupTimer = setInterval(() => {
        const expired = cleanupExpiredMessages();

        if (expired.length > 0) {
            self.postMessage({
                type: 'MESSAGES_EXPIRED',
                payload: {
                    expiredMessages: expired,
                    remainingCount: messages.size
                }
            });
        }

        // 如果沒有訊息了，停止計時器
        if (messages.size === 0) {
            clearInterval(cleanupTimer);
            cleanupTimer = null;
        }
    }, config.cleanupInterval);
}

/**
 * 清理過期訊息
 */
function cleanupExpiredMessages() {
    const now = Date.now();
    const expired = [];

    messages.forEach((msg, id) => {
        if (msg.expiresAt !== null && msg.expiresAt <= now) {
            expired.push({
                messageId: id,
                content: msg.content,
                createdAt: msg.createdAt,
                expiredAt: now,
                ttl: msg.ttl
            });
            messages.delete(id);
        }
    });

    return expired;
}

/**
 * 發送錯誤訊息
 */
function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}

// 初始化時啟動狀態更新
setInterval(() => {
    if (messages.size > 0) {
        handleGetStatus();
    }
}, 500);  // 每 500ms 更新一次狀態
