/**
 * 160. 任務取消 - 主執行緒
 * 展示如何使用 AbortController 與 Web Worker 配合實現任務取消
 */

const startBtn = document.getElementById('start-btn');
const cancelBtn = document.getElementById('cancel-btn');
const logContainer = document.getElementById('log-container');
const statusDisplay = document.getElementById('status-display');
const durationInput = document.getElementById('duration');

let abortController = null;
let currentWorker = null;

// 工具函數：寫入日誌
function log(message, type = 'normal') {
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logContainer.prepend(div);
}

// 啟動任務
startBtn.addEventListener('click', async () => {
    const duration = parseInt(durationInput.value) || 5;

    // 1. 初始化 AbortController
    abortController = new AbortController();
    const signal = abortController.signal;

    // 更新 UI
    startBtn.disabled = true;
    cancelBtn.disabled = false;
    statusDisplay.textContent = '任務執行中...';
    log(`任務開始，預計耗時 ${duration} 秒...`, 'info');

    try {
        // 2. 呼叫可取消的任務函數
        const result = await runCancellableTask(duration, signal);
        log(`任務完成！結果: ${result}`, 'success');
        statusDisplay.textContent = '任務完成';
    } catch (error) {
        if (error.name === 'AbortError') {
            log('任務已被使用者取消', 'error');
            statusDisplay.textContent = '任務已取消';
        } else {
            log(`任務錯誤: ${error.message}`, 'error');
            statusDisplay.textContent = '發生錯誤';
        }
    } finally {
        // 重置 UI
        startBtn.disabled = false;
        cancelBtn.disabled = true;
        abortController = null;
        currentWorker = null;
    }
});

// 取消任務
cancelBtn.addEventListener('click', () => {
    if (abortController) {
        log('正在發送取消信號...', 'info');
        abortController.abort(); // 觸發 abort 事件
    }
});

/**
 * 執行可取消的任務
 * @param {number} durationSeconds - 模擬任務長度
 * @param {AbortSignal} signal - 取消信號
 * @returns {Promise<any>}
 */
function runCancellableTask(durationSeconds, signal) {
    return new Promise((resolve, reject) => {
        // 檢查是否已經取消
        if (signal.aborted) {
            return reject(new DOMException('Aborted', 'AbortError'));
        }

        // 建立 Worker
        const worker = new Worker('worker.js');
        currentWorker = worker;

        // 監聽 Worker 訊息
        worker.onmessage = (e) => {
            const { type, data } = e.data;
            if (type === 'done') {
                worker.terminate();
                resolve(data);
            }
        };

        worker.onerror = (e) => {
            worker.terminate();
            reject(new Error(e.message));
        };

        // 監聽 AbortSignal 的 abort 事件
        // 當 controller.abort() 被呼叫時觸發
        signal.addEventListener('abort', () => {
            // 立即終止 Worker
            worker.terminate();
            reject(new DOMException('Aborted', 'AbortError'));
        });

        // 啟動 Worker 任務
        worker.postMessage({
            command: 'start',
            duration: durationSeconds * 1000
        });
    });
}
