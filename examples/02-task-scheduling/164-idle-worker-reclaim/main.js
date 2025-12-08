class WorkerPool {
    constructor(idleTimeout = 3000, checkInterval = 1000) {
        this.workers = []; // Array of worker objects: { id, worker, status, lastUsed }
        this.taskQueue = [];
        this.idleTimeout = idleTimeout;
        this.checkInterval = checkInterval;
        this.nextWorkerId = 1;
        this.reclaimIntervalId = null;

        this.startReclaimLoop();
    }

    startReclaimLoop() {
        if (this.reclaimIntervalId) clearInterval(this.reclaimIntervalId);
        this.reclaimIntervalId = setInterval(() => this.reclaimIdleWorkers(), this.checkInterval);
        log(`Worker 回收機制已啟動，閒置逾時: ${this.idleTimeout}ms, 檢查間隔: ${this.checkInterval}ms`);
    }

    updateConfig(idleTimeout, checkInterval) {
        this.idleTimeout = idleTimeout;
        this.checkInterval = checkInterval;
        this.startReclaimLoop();
    }

    getWorker() {
        // Try to find an idle worker
        const idleWorker = this.workers.find(w => w.status === 'idle');

        if (idleWorker) {
            idleWorker.status = 'active';
            idleWorker.lastUsed = Date.now();
            this.updateWorkerUI(idleWorker);
            return idleWorker;
        }

        // No idle worker, create a new one
        return this.createWorker();
    }

    createWorker() {
        const id = this.nextWorkerId++;
        const worker = new Worker('worker.js');
        const workerObj = {
            id,
            worker,
            status: 'active',
            lastUsed: Date.now()
        };

        worker.onmessage = (e) => {
            this.handleWorkerMessage(workerObj, e.data);
        };

        this.workers.push(workerObj);
        this.createWorkerUI(workerObj);
        log(`Worker #${id} 已創建`);
        updateStats();
        return workerObj;
    }

    handleWorkerMessage(workerObj, data) {
        const { taskId, status } = data;
        if (status === 'completed') {
            log(`任務 #${taskId} 由 Worker #${workerObj.id} 完成`);

            // Check if there are tasks in queue
            if (this.taskQueue.length > 0) {
                const nextTask = this.taskQueue.shift();
                this.runTaskOnWorker(workerObj, nextTask);
            } else {
                workerObj.status = 'idle';
                workerObj.lastUsed = Date.now();
                this.updateWorkerUI(workerObj);
                updateStats();
            }
        }
    }

    runTask(task) {
        const workerObj = this.getWorker();
        this.runTaskOnWorker(workerObj, task);
    }

    runTaskOnWorker(workerObj, task) {
        log(`任務 #${task.id} 分配給 Worker #${workerObj.id}`);
        workerObj.status = 'active';
        workerObj.lastUsed = Date.now();
        this.updateWorkerUI(workerObj);
        workerObj.worker.postMessage({ taskId: task.id, duration: task.duration });
        updateStats();
    }

    reclaimIdleWorkers() {
        const now = Date.now();
        const activeWorkers = this.workers.filter(w => w.status === 'active');
        const idleWorkers = this.workers.filter(w => w.status === 'idle');

        // Always keep at least one worker if there are no tasks, or you can decide to kill all.
        // For this demo, we will reclaim ALL idle workers that timed out.

        const workersToRemove = [];

        idleWorkers.forEach(w => {
            if (now - w.lastUsed > this.idleTimeout) {
                workersToRemove.push(w);
            }
        });

        if (workersToRemove.length > 0) {
            log(`發現 ${workersToRemove.length} 個閒置逾時的 Worker，準備回收...`);

            workersToRemove.forEach(w => {
                this.terminateWorker(w);
            });
        }

        // Update timer UI for idle workers
        idleWorkers.forEach(w => {
             if (!workersToRemove.includes(w)) {
                 this.updateWorkerTimerUI(w);
             }
        });
    }

    terminateWorker(workerObj) {
        // Remove from array first to avoid race conditions if any
        this.workers = this.workers.filter(w => w.id !== workerObj.id);

        // Update UI to show terminating state briefly
        const el = document.getElementById(`worker-${workerObj.id}`);
        if (el) {
            el.className = 'worker-card terminating';
            el.querySelector('.worker-status').textContent = 'Terminating';
        }

        setTimeout(() => {
            workerObj.worker.terminate();
            this.removeWorkerUI(workerObj);
            log(`Worker #${workerObj.id} 已回收 (閒置 ${(Date.now() - workerObj.lastUsed) / 1000}s)`);
            updateStats();
        }, 500); // Small delay for visual effect
    }

    createWorkerUI(workerObj) {
        const container = document.getElementById('workerContainer');
        const el = document.createElement('div');
        el.id = `worker-${workerObj.id}`;
        el.className = `worker-card ${workerObj.status}`;
        el.innerHTML = `
            <div class="worker-id">Worker #${workerObj.id}</div>
            <div class="worker-status">${workerObj.status}</div>
            <div class="worker-timer" id="timer-${workerObj.id}">-</div>
        `;
        container.appendChild(el);
    }

    updateWorkerUI(workerObj) {
        const el = document.getElementById(`worker-${workerObj.id}`);
        if (el) {
            el.className = `worker-card ${workerObj.status}`;
            el.querySelector('.worker-status').textContent = workerObj.status;
            if (workerObj.status === 'active') {
                el.querySelector('.worker-timer').textContent = 'Working...';
            } else {
                this.updateWorkerTimerUI(workerObj);
            }
        }
    }

    updateWorkerTimerUI(workerObj) {
        const el = document.getElementById(`timer-${workerObj.id}`);
        if (el) {
             const idleTime = Date.now() - workerObj.lastUsed;
             el.textContent = `Idle: ${(idleTime / 1000).toFixed(1)}s`;
        }
    }

    removeWorkerUI(workerObj) {
        const el = document.getElementById(`worker-${workerObj.id}`);
        if (el) {
            el.remove();
        }
    }
}

// Global state
let pool;
let nextTaskId = 1;

// Helper functions
function log(msg) {
    const logContent = document.getElementById('logContent');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
}

function updateStats() {
    if (!pool) return;
    const active = pool.workers.filter(w => w.status === 'active').length;
    const idle = pool.workers.filter(w => w.status === 'idle').length;
    const total = pool.workers.length;

    document.getElementById('activeCount').textContent = active;
    document.getElementById('idleCount').textContent = idle;
    document.getElementById('totalCount').textContent = total;
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    pool = new WorkerPool();
    updateStats();

    document.getElementById('addTaskBtn').addEventListener('click', () => {
        const duration = Math.floor(Math.random() * 2000) + 1000; // 1-3s duration
        pool.runTask({ id: nextTaskId++, duration });
    });

    document.getElementById('addBurstBtn').addEventListener('click', () => {
        for(let i=0; i<10; i++) {
            const duration = Math.floor(Math.random() * 2000) + 1000;
            pool.runTask({ id: nextTaskId++, duration });
        }
    });

    document.getElementById('updateConfigBtn').addEventListener('click', () => {
        const idleTimeout = parseInt(document.getElementById('idleTimeout').value, 10);
        const checkInterval = parseInt(document.getElementById('checkInterval').value, 10);
        pool.updateConfig(idleTimeout, checkInterval);
    });
});
