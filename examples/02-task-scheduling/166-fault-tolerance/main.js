class WorkerPool {
    constructor(maxWorkers = 4) {
        this.maxWorkers = maxWorkers;
        this.workers = []; // Array of { id, worker, status, currentTask }
        this.taskQueue = [];
        this.tasks = new Map(); // id -> task data
        this.nextWorkerId = 1;
        this.nextTaskId = 1;
        this.retryStats = 0;

        this.initWorkers();
    }

    initWorkers() {
        for (let i = 0; i < this.maxWorkers; i++) {
            this.createWorker();
        }
    }

    createWorker() {
        const id = this.nextWorkerId++;
        const worker = new Worker('worker.js');
        const workerObj = {
            id,
            worker,
            status: 'idle',
            currentTask: null
        };

        worker.onmessage = (e) => this.handleWorkerMessage(workerObj, e.data);
        worker.onerror = (e) => this.handleWorkerError(workerObj, e);

        this.workers.push(workerObj);
        this.createWorkerUI(workerObj);
        log(`Worker #${id} 已啟動`);
        return workerObj;
    }

    handleWorkerMessage(workerObj, data) {
        const { taskId, status } = data;

        if (status === 'completed') {
            const task = this.tasks.get(taskId);
            if (task) {
                task.status = 'completed';
                task.completedAt = Date.now();
                this.updateTaskUI(task);
                log(`任務 #${taskId} 由 Worker #${workerObj.id} 完成`);
            }

            workerObj.status = 'idle';
            workerObj.currentTask = null;
            this.updateWorkerUI(workerObj);
            this.processQueue();
            updateStats();
        }
    }

    handleWorkerError(workerObj, error) {
        // This catches script errors, but termination (kill) doesn't trigger onerror automatically in all cases.
        // In this demo, we use manual kill, so we handle logic in killWorker.
        // But if script error occurs:
        log(`Worker #${workerObj.id} 發生錯誤: ${error.message}`, 'error');
        this.handleWorkerFailure(workerObj);
    }

    handleWorkerFailure(workerObj) {
        const failedTask = workerObj.currentTask;

        // 1. Remove dead worker
        workerObj.worker.terminate();
        this.workers = this.workers.filter(w => w.id !== workerObj.id);

        // Visual update for dead worker
        const el = document.getElementById(`worker-${workerObj.id}`);
        if (el) {
            el.className = 'worker-card dead';
            el.querySelector('.worker-status').textContent = 'Dead';
        }

        // 2. Handle failed task (Retry logic)
        if (failedTask) {
            const task = this.tasks.get(failedTask.id);
            if (task) {
                task.retryCount = (task.retryCount || 0) + 1;
                task.status = 'retrying';
                this.retryStats++;
                log(`任務 #${task.id} 因 Worker #${workerObj.id} 故障而失敗，正在重試 (次數: ${task.retryCount})`, 'retry');
                this.updateTaskUI(task);

                // Re-add to queue at the front
                this.taskQueue.unshift(task);
            }
        }

        // 3. Replace worker
        setTimeout(() => {
            const el = document.getElementById(`worker-${workerObj.id}`);
            if(el) el.remove();

            this.createWorker();
            this.processQueue();
        }, 1000); // Delay replacement for visual effect

        updateStats();
    }

    addTask(duration) {
        const id = this.nextTaskId++;
        const task = {
            id,
            duration,
            status: 'pending',
            createdAt: Date.now(),
            retryCount: 0
        };

        this.tasks.set(id, task);
        this.taskQueue.push(task);
        this.createTaskUI(task);
        log(`任務 #${id} 已新增 (時長: ${duration}ms)`);

        this.processQueue();
        updateStats();
    }

    processQueue() {
        if (this.taskQueue.length === 0) return;

        const idleWorker = this.workers.find(w => w.status === 'idle');
        if (idleWorker) {
            const task = this.taskQueue.shift();
            this.runTask(idleWorker, task);
        }
    }

    runTask(workerObj, task) {
        workerObj.status = 'working';
        workerObj.currentTask = task;
        task.status = 'running';
        task.assignedWorker = workerObj.id;

        this.updateWorkerUI(workerObj);
        this.updateTaskUI(task);

        log(`任務 #${task.id} 分配給 Worker #${workerObj.id}`);
        workerObj.worker.postMessage({ taskId: task.id, duration: task.duration });
        updateStats();
    }

    killRandomWorker() {
        const workingWorkers = this.workers.filter(w => w.status === 'working');

        if (workingWorkers.length === 0) {
            log('沒有正在工作的 Worker 可供殺死', 'error');
            return;
        }

        const randomIndex = Math.floor(Math.random() * workingWorkers.length);
        const victim = workingWorkers[randomIndex];

        log(`人為製造故障: 殺死正在執行任務 #${victim.currentTask.id} 的 Worker #${victim.id}`, 'error');

        // Manually trigger failure handling
        this.handleWorkerFailure(victim);
    }

    // UI Helpers
    createWorkerUI(workerObj) {
        const container = document.getElementById('workerContainer');
        const el = document.createElement('div');
        el.id = `worker-${workerObj.id}`;
        el.className = `worker-card ${workerObj.status}`;
        el.innerHTML = `
            <div class="worker-id">Worker #${workerObj.id}</div>
            <div class="worker-status">${workerObj.status}</div>
        `;
        container.appendChild(el);
    }

    updateWorkerUI(workerObj) {
        const el = document.getElementById(`worker-${workerObj.id}`);
        if (el) {
            el.className = `worker-card ${workerObj.status}`;
            el.querySelector('.worker-status').textContent = workerObj.status;
            if (workerObj.currentTask) {
                 el.querySelector('.worker-status').textContent = `Task #${workerObj.currentTask.id}`;
            }
        }
    }

    createTaskUI(task) {
        const container = document.getElementById('taskContainer');
        const el = document.createElement('div');
        el.id = `task-${task.id}`;
        el.className = `task-item ${task.status}`;
        el.innerHTML = this.getTaskHTML(task);
        container.prepend(el); // Newest top
    }

    updateTaskUI(task) {
        const el = document.getElementById(`task-${task.id}`);
        if (el) {
            el.className = `task-item ${task.status}`;
            el.innerHTML = this.getTaskHTML(task);
        }
    }

    getTaskHTML(task) {
        let statusInfo = task.status;
        if (task.status === 'running') statusInfo = `Running on W#${task.assignedWorker}`;
        if (task.status === 'retrying') statusInfo = `Retrying (${task.retryCount})`;

        return `
            <span>Task #${task.id} (${task.duration}ms)</span>
            <span class="task-status">${statusInfo}</span>
        `;
    }
}

const pool = new WorkerPool(4);

document.getElementById('addTaskBtn').addEventListener('click', () => {
    const duration = Math.floor(Math.random() * 3000) + 2000; // 2-5s
    pool.addTask(duration);
});

document.getElementById('killRandomBtn').addEventListener('click', () => {
    pool.killRandomWorker();
});

function log(msg, type = 'info') {
    const logContent = document.getElementById('logContent');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    if (type === 'error') entry.classList.add('log-error');
    if (type === 'retry') entry.classList.add('log-retry');

    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;

    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
}

function updateStats() {
    const pending = pool.taskQueue.length;
    const running = Array.from(pool.tasks.values()).filter(t => t.status === 'running').length;
    const completed = Array.from(pool.tasks.values()).filter(t => t.status === 'completed').length;

    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('runningCount').textContent = running;
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('retryCount').textContent = pool.retryStats;
}
