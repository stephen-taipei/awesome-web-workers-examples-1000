/**
 * 163. 任務去重 - 主執行緒
 * 實作 Promise-based 的任務去重機制
 */

const taskIdInput = document.getElementById('task-id');
const singleBtn = document.getElementById('single-req-btn');
const spamBtn = document.getElementById('spam-req-btn');
const logContainer = document.getElementById('log-container');

// === 任務管理器 (含去重邏輯) ===
class TaskManager {
    constructor() {
        this.pendingTasks = new Map(); // 用於儲存進行中的任務 Promise
        this.worker = new Worker('worker.js');

        // 設定 Worker 訊息處理
        this.worker.onmessage = (e) => {
            const { id, result } = e.data;
            this.resolveTask(id, result);
        };
    }

    /**
     * 請求執行任務
     * @param {string} id - 任務識別碼 (如參數雜湊)
     * @returns {Promise}
     */
    requestTask(id) {
        // 1. 檢查是否有相同的任務正在進行中
        if (this.pendingTasks.has(id)) {
            log(`請求任務 ${id}: 發現重複任務，合併請求 (Deduplicated)`, 'dedup');
            return this.pendingTasks.get(id).promise;
        }

        log(`請求任務 ${id}: 建立新任務 (New Task)`, 'new');

        // 2. 建立新的 Promise
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });

        // 3. 存入 pendingTasks Map
        this.pendingTasks.set(id, { promise, resolve, reject });

        // 4. 發送給 Worker 執行
        this.worker.postMessage({ id, duration: 2000 }); // 模擬 2 秒耗時任務

        return promise;
    }

    resolveTask(id, result) {
        if (this.pendingTasks.has(id)) {
            const { resolve } = this.pendingTasks.get(id);
            resolve(result);
            this.pendingTasks.delete(id); // 移除已完成的任務
        }
    }
}

const manager = new TaskManager();

// === UI 事件 ===

singleBtn.addEventListener('click', () => {
    const id = taskIdInput.value;
    handleRequest(id);
});

spamBtn.addEventListener('click', () => {
    const id = taskIdInput.value;
    log(`--- 開始快速發送 5 次請求 (ID: ${id}) ---`, 'info');

    // 模擬快速連續點擊
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            handleRequest(id, i + 1);
        }, i * 100); // 每 100ms 發送一次，確保在任務完成前 (2000ms) 重複觸發
    }
});

async function handleRequest(id, seq) {
    const seqStr = seq ? `[#${seq}] ` : '';
    try {
        const result = await manager.requestTask(id);
        log(`${seqStr}收到結果: ${result}`, 'info');
    } catch (e) {
        log(`${seqStr}錯誤: ${e}`, 'info');
    }
}

// === 工具函數 ===

function log(message, type) {
    const div = document.createElement('div');
    div.className = 'log-item';

    let badgeClass = 'badge-info';
    let badgeText = 'INFO';

    if (type === 'new') { badgeClass = 'badge-new'; badgeText = 'NEW'; }
    if (type === 'dedup') { badgeClass = 'badge-dedup'; badgeText = 'DEDUP'; }

    div.innerHTML = `<span class="badge ${badgeClass}">${badgeText}</span> ${message}`;
    logContainer.prepend(div);
}
