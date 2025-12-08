/**
 * 162. 結果快取 - 主執行緒
 * 實作一個簡單的 LRU Cache 來管理計算結果
 */

const input = document.getElementById('fib-input');
const calcBtn = document.getElementById('calc-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');
const logContainer = document.getElementById('log-container');
const cacheStats = document.getElementById('cache-stats');

// === LRU Cache 實作 ===
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map(); // Map 會保持插入順序，可用作 LRU
    }

    get(key) {
        if (!this.cache.has(key)) return undefined;

        // LRU 關鍵：存取後移到 Map 的最後面（表示最近使用）
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    put(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            // 刪除 Map 的第一個元素（最久未使用的）
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            log(`快取已滿，移除最舊項目: N=${firstKey}`, 'normal');
        }
        this.cache.set(key, value);
        updateStats();
    }

    clear() {
        this.cache.clear();
        updateStats();
    }

    size() {
        return this.cache.size;
    }
}

// 初始化快取，容量為 5
const workerCache = new LRUCache(5);

// 建立 Worker
const worker = new Worker('worker.js');
worker.onmessage = handleWorkerMessage;

// === 事件處理 ===

calcBtn.addEventListener('click', () => {
    const n = parseInt(input.value);
    if (isNaN(n) || n < 1) return alert('請輸入有效數字');

    log(`請求計算 Fibonacci(${n})...`, 'normal');

    // 1. 檢查快取
    const cachedResult = workerCache.get(n);
    if (cachedResult !== undefined) {
        log(`快取命中 (Cache Hit)! 結果: ${cachedResult}`, 'cache-hit');
        updateStats();
        return;
    }

    // 2. 快取未命中，發送給 Worker
    log(`快取未命中 (Cache Miss)，啟動 Worker 計算...`, 'cache-miss');
    calcBtn.disabled = true;
    worker.postMessage({ command: 'calculate', value: n });
});

clearCacheBtn.addEventListener('click', () => {
    workerCache.clear();
    log('快取已清空', 'normal');
});

function handleWorkerMessage(e) {
    const { n, result, duration } = e.data;

    // 3. 收到結果，存入快取
    workerCache.put(n, result);

    log(`Worker 計算完成: Fibonacci(${n}) = ${result} (耗時 ${duration}ms)`, 'normal');
    calcBtn.disabled = false;
}

// === 工具函數 ===

function log(message, type) {
    const div = document.createElement('div');
    div.className = `log-item ${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.prepend(div);
}

function updateStats() {
    cacheStats.textContent = `大小: ${workerCache.size()} / 容量: ${workerCache.capacity}`;
}
