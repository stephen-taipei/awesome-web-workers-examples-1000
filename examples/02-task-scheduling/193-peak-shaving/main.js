// 主執行緒邏輯

let maxConcurrency = 3;
let queueCapacity = 5;

let activeWorkers = 0;
let taskQueue = [];
let totalSubmitted = 0;
let totalRejected = 0;
let workers = [];

const activeWorkersEl = document.getElementById('active-workers');
const queueLengthEl = document.getElementById('queue-length');
const totalSubmittedEl = document.getElementById('total-submitted');
const totalRejectedEl = document.getElementById('total-rejected');
const activityLogEl = document.getElementById('activity-log');
const loadBarEl = document.getElementById('load-bar');

function log(type, message) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg">${message}</span>`;
    activityLogEl.prepend(entry);
}

function updateDashboard() {
    activeWorkersEl.textContent = `${activeWorkers} / ${maxConcurrency}`;
    queueLengthEl.textContent = `${taskQueue.length} / ${queueCapacity}`;
    totalSubmittedEl.textContent = totalSubmitted;
    totalRejectedEl.textContent = totalRejected;

    const totalLoad = activeWorkers + taskQueue.length;
    const maxLoad = maxConcurrency + queueCapacity;
    const loadPercentage = Math.min((totalLoad / maxLoad) * 100, 100);
    loadBarEl.style.width = `${loadPercentage}%`;
}

function createWorker() {
    const worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { id, result } = e.data;
        log('success', `任務 #${id} 完成`);
        activeWorkers--;

        // 嘗試從佇列中取出下一個任務
        processNextTask();
        updateDashboard();

        // 任務完成後終止 Worker (此範例採用一次性 Worker 模擬資源釋放，也可改為 Worker Pool)
        worker.terminate();
    };
    return worker;
}

function processNextTask() {
    if (activeWorkers < maxConcurrency && taskQueue.length > 0) {
        const task = taskQueue.shift();
        const worker = createWorker();
        activeWorkers++;
        worker.postMessage(task);
        log('start', `任務 #${task.id} 開始執行 (從佇列取出)`);
        updateDashboard();
    }
}

function submitTask() {
    totalSubmitted++;
    const taskId = totalSubmitted;

    // 1. 檢查是否有空閒 Worker
    if (activeWorkers < maxConcurrency) {
        const worker = createWorker();
        activeWorkers++;
        worker.postMessage({ id: taskId, duration: 2000 + Math.random() * 2000 }); // 模擬 2-4 秒的任務
        log('start', `任務 #${taskId} 直接開始執行`);
    }
    // 2. 檢查佇列是否已滿
    else if (taskQueue.length < queueCapacity) {
        taskQueue.push({ id: taskId, duration: 2000 + Math.random() * 2000 });
        log('queue', `任務 #${taskId} 進入佇列等待`);
    }
    // 3. 拒絕請求 (峰值分流/背壓)
    else {
        totalRejected++;
        log('reject', `任務 #${taskId} 被拒絕 (系統過載)`);
    }
    updateDashboard();
}

document.getElementById('add-task-btn').addEventListener('click', submitTask);

document.getElementById('burst-task-btn').addEventListener('click', () => {
    for (let i = 0; i < 10; i++) {
        submitTask();
    }
});

document.getElementById('apply-settings-btn').addEventListener('click', () => {
    maxConcurrency = parseInt(document.getElementById('max-concurrency').value, 10);
    queueCapacity = parseInt(document.getElementById('queue-capacity').value, 10);

    // 重置系統狀態
    activeWorkers = 0;
    taskQueue = [];
    totalSubmitted = 0;
    totalRejected = 0;
    activityLogEl.innerHTML = '';

    // 這裡簡單重置顯示，實際應用可能需要優雅關閉現有 Worker
    log('success', `系統參數已更新: Max Workers=${maxConcurrency}, Queue Limit=${queueCapacity}`);
    updateDashboard();
});

// 初始化
updateDashboard();
