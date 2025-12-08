/**
 * 訊息去重機制 Web Worker
 *
 * 功能：檢測重複訊息，透過雜湊或 ID 進行去重
 * 通訊模式：postMessage with hash-based deduplication
 *
 * @description
 * 此 Worker 負責：
 * 1. 計算訊息內容的雜湊值
 * 2. 維護雜湊快取 (LRU 策略)
 * 3. 判斷訊息是否為重複
 * 4. 回報去重結果
 */

// ===== 配置 =====

let config = {
    strategy: 'content-hash',  // 'content-hash', 'message-id', 'both'
    cacheSize: 100
};

// ===== LRU 快取 =====

class LRUCache {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    has(key) {
        if (this.cache.has(key)) {
            // 更新訪問順序
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            return true;
        }
        return false;
    }

    set(key, value) {
        // 如果已存在，先刪除以更新順序
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // 如果達到最大容量，刪除最舊的項目
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, value);
    }

    get(key) {
        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
        }
        return undefined;
    }

    clear() {
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }

    entries() {
        return Array.from(this.cache.entries());
    }

    resize(newSize) {
        this.maxSize = newSize;
        while (this.cache.size > this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }
}

// 雜湊快取
let hashCache = new LRUCache(config.cacheSize);

// 訊息 ID 快取
let idCache = new LRUCache(config.cacheSize);

// ===== 訊息處理 =====

self.onmessage = async function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'CONFIGURE':
            handleConfigure(payload);
            break;

        case 'CHECK_MESSAGE':
            await handleCheckMessage(payload);
            break;

        case 'CLEAR_CACHE':
            handleClearCache();
            break;

        case 'GET_CACHE_STATUS':
            handleGetCacheStatus();
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

/**
 * 處理配置更新
 */
function handleConfigure(payload) {
    if (payload.strategy) {
        config.strategy = payload.strategy;
    }
    if (payload.cacheSize) {
        config.cacheSize = payload.cacheSize;
        hashCache.resize(config.cacheSize);
        idCache.resize(config.cacheSize);
    }

    self.postMessage({
        type: 'CONFIGURED',
        payload: {
            ...config,
            hashCacheSize: hashCache.size(),
            idCacheSize: idCache.size()
        }
    });
}

/**
 * 檢查訊息是否重複
 */
async function handleCheckMessage(payload) {
    const { messageId, content, timestamp } = payload;

    let isDuplicate = false;
    let duplicateReason = null;
    let contentHash = null;

    // 根據策略檢查
    if (config.strategy === 'message-id' || config.strategy === 'both') {
        if (idCache.has(messageId)) {
            isDuplicate = true;
            duplicateReason = 'message-id';
        }
    }

    if (!isDuplicate && (config.strategy === 'content-hash' || config.strategy === 'both')) {
        contentHash = await computeHash(content);
        if (hashCache.has(contentHash)) {
            isDuplicate = true;
            duplicateReason = 'content-hash';
        }
    }

    // 如果不是重複，則加入快取
    if (!isDuplicate) {
        if (config.strategy === 'message-id' || config.strategy === 'both') {
            idCache.set(messageId, { timestamp, content });
        }
        if (config.strategy === 'content-hash' || config.strategy === 'both') {
            if (!contentHash) {
                contentHash = await computeHash(content);
            }
            hashCache.set(contentHash, { messageId, timestamp });
        }
    }

    self.postMessage({
        type: 'CHECK_RESULT',
        payload: {
            messageId,
            content,
            contentHash: contentHash || await computeHash(content),
            isDuplicate,
            duplicateReason,
            timestamp,
            cacheStatus: {
                hashCacheSize: hashCache.size(),
                idCacheSize: idCache.size(),
                maxSize: config.cacheSize
            }
        }
    });
}

/**
 * 清除快取
 */
function handleClearCache() {
    hashCache.clear();
    idCache.clear();

    self.postMessage({
        type: 'CACHE_CLEARED',
        payload: {
            hashCacheSize: 0,
            idCacheSize: 0
        }
    });
}

/**
 * 取得快取狀態
 */
function handleGetCacheStatus() {
    self.postMessage({
        type: 'CACHE_STATUS',
        payload: {
            hashCacheSize: hashCache.size(),
            idCacheSize: idCache.size(),
            maxSize: config.cacheSize,
            hashEntries: hashCache.entries().slice(-10).map(([hash, data]) => ({
                hash: hash.substring(0, 16) + '...',
                messageId: data.messageId
            })),
            idEntries: idCache.entries().slice(-10).map(([id, data]) => ({
                id,
                content: data.content.substring(0, 30)
            }))
        }
    });
}

/**
 * 計算 SHA-256 雜湊
 */
async function computeHash(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
