/**
 * #604 Dynamic Worker Pool
 * Auto-scaling pool based on workload
 */

class DynamicWorkerPool {
    constructor(minWorkers, maxWorkers, workerScript) {
        this.minWorkers = minWorkers;
        this.maxWorkers = maxWorkers;
        this.workerScript = workerScript;
        this.workers = new Map(); // id -> {worker, status, lastActive}
        this.taskQueue = [];
        this.taskIdCounter = 0;
        this.workerIdCounter = 0;
        this.scaleCheckInterval = null;
        this.idleTimeout = 5000; // 5 seconds

        this.onStatusChange = null;
        this.onLog = null;

        this.initialize();
    }

    initialize() {
        // Start with minimum workers
        for (let i = 0; i < this.minWorkers; i++) {
            this.addWorker();
        }
        // Start scale checker
        this.scaleCheckInterval = setInterval(() => this.checkScale(), 1000);
        this.notifyStatus();
    }

    addWorker() {
        if (this.workers.size >= this.maxWorkers) return null;

        const id = ++this.workerIdCounter;
        const worker = new Worker(this.workerScript);

        worker.onmessage = (e) => this.handleMessage(id, e);
        worker.onerror = (e) => this.handleError(id, e);

        this.workers.set(id, {
            worker,
            status: 'idle',
            lastActive: Date.now(),
            currentTask: null
        });

        this.log(`Worker #${id} added (total: ${this.workers.size})`);
        this.notifyStatus();
        return id;
    }

    removeWorker(id) {
        if (this.workers.size <= this.minWorkers) return false;

        const workerInfo = this.workers.get(id);
        if (workerInfo && workerInfo.status === 'idle') {
            workerInfo.worker.terminate();
            this.workers.delete(id);
            this.log(`Worker #${id} removed (total: ${this.workers.size})`);
            this.notifyStatus();
            return true;
        }
        return false;
    }

    submitTask(taskData) {
        const taskId = ++this.taskIdCounter;
        const task = { id: taskId, data: taskData };

        // Find idle worker
        const idleWorker = this.findIdleWorker();
        if (idleWorker) {
            this.executeTask(idleWorker, task);
        } else {
            this.taskQueue.push(task);
            this.log(`Task #${taskId} queued (queue: ${this.taskQueue.length})`);
            // Try to scale up
            this.scaleUp();
        }

        this.notifyStatus();
        return taskId;
    }

    findIdleWorker() {
        for (const [id, info] of this.workers) {
            if (info.status === 'idle') {
                return id;
            }
        }
        return null;
    }

    executeTask(workerId, task) {
        const workerInfo = this.workers.get(workerId);
        if (!workerInfo) return;

        workerInfo.status = 'busy';
        workerInfo.currentTask = task;
        workerInfo.lastActive = Date.now();

        workerInfo.worker.postMessage({
            type: 'execute',
            data: { taskId: task.id, ...task.data }
        });

        this.log(`Task #${task.id} started on Worker #${workerId}`);
    }

    handleMessage(workerId, event) {
        const { type, data } = event.data;
        const workerInfo = this.workers.get(workerId);

        if (type === 'complete' && workerInfo) {
            this.log(`Task #${data.taskId} completed by Worker #${workerId} (${data.duration.toFixed(0)}ms)`);

            workerInfo.status = 'idle';
            workerInfo.currentTask = null;
            workerInfo.lastActive = Date.now();

            // Process next queued task
            if (this.taskQueue.length > 0) {
                const nextTask = this.taskQueue.shift();
                this.executeTask(workerId, nextTask);
            }

            this.notifyStatus();
        }
    }

    handleError(workerId, error) {
        this.log(`Worker #${workerId} error: ${error.message}`);
        // Recreate worker
        const workerInfo = this.workers.get(workerId);
        if (workerInfo) {
            workerInfo.worker.terminate();
            workerInfo.worker = new Worker(this.workerScript);
            workerInfo.worker.onmessage = (e) => this.handleMessage(workerId, e);
            workerInfo.worker.onerror = (e) => this.handleError(workerId, e);
            workerInfo.status = 'idle';
            workerInfo.lastActive = Date.now();
        }
        this.notifyStatus();
    }

    scaleUp() {
        if (this.workers.size < this.maxWorkers && this.taskQueue.length > 0) {
            const newId = this.addWorker();
            if (newId && this.taskQueue.length > 0) {
                const task = this.taskQueue.shift();
                this.executeTask(newId, task);
            }
        }
    }

    checkScale() {
        const now = Date.now();

        // Scale down idle workers
        for (const [id, info] of this.workers) {
            if (info.status === 'idle' &&
                this.workers.size > this.minWorkers &&
                now - info.lastActive > this.idleTimeout) {
                this.removeWorker(id);
                break; // Remove one at a time
            }
        }
    }

    notifyStatus() {
        if (this.onStatusChange) {
            const workers = [];
            for (const [id, info] of this.workers) {
                workers.push({
                    id,
                    status: info.status,
                    taskId: info.currentTask?.id
                });
            }
            this.onStatusChange({
                workerCount: this.workers.size,
                minWorkers: this.minWorkers,
                maxWorkers: this.maxWorkers,
                queueLength: this.taskQueue.length,
                workers
            });
        }
    }

    log(message) {
        if (this.onLog) {
            this.onLog(`[${new Date().toLocaleTimeString()}] ${message}`);
        }
    }

    terminate() {
        clearInterval(this.scaleCheckInterval);
        for (const [, info] of this.workers) {
            info.worker.terminate();
        }
        this.workers.clear();
        this.taskQueue = [];
    }
}

// UI Management
let pool = null;
const logs = [];

const elements = {
    minWorkers: document.getElementById('min-workers'),
    maxWorkers: document.getElementById('max-workers'),
    addTaskBtn: document.getElementById('add-task-btn'),
    addManyBtn: document.getElementById('add-many-btn'),
    resetBtn: document.getElementById('reset-btn'),
    poolStatus: document.getElementById('pool-status'),
    workersVisualization: document.getElementById('workers-visualization'),
    activityLog: document.getElementById('activity-log')
};

function initPool() {
    const min = parseInt(elements.minWorkers.value);
    const max = parseInt(elements.maxWorkers.value);

    if (pool) pool.terminate();
    logs.length = 0;

    pool = new DynamicWorkerPool(min, max, 'worker.js');
    pool.onStatusChange = updateStatus;
    pool.onLog = addLog;
}

function addTask() {
    if (!pool) initPool();
    pool.submitTask({
        iterations: 200000 + Math.floor(Math.random() * 800000)
    });
}

function addManyTasks() {
    for (let i = 0; i < 10; i++) {
        addTask();
    }
}

function updateStatus(status) {
    elements.poolStatus.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Workers:</span>
            <span class="stat-value">${status.workerCount} (${status.minWorkers}-${status.maxWorkers})</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Queue:</span>
            <span class="stat-value">${status.queueLength}</span>
        </div>
    `;

    let html = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:15px;">';
    status.workers.forEach(w => {
        const color = w.status === 'busy' ? 'var(--success-color)' : 'var(--secondary-color)';
        const text = w.status === 'busy' ? `#${w.taskId}` : 'Idle';
        html += `<div style="padding:10px 15px;background:${color};border-radius:8px;color:white;">W${w.id}: ${text}</div>`;
    });
    html += '</div>';
    elements.workersVisualization.innerHTML = html;
}

function addLog(message) {
    logs.unshift(message);
    if (logs.length > 50) logs.pop();
    elements.activityLog.innerHTML = logs.map(l =>
        `<div style="padding:4px 0;border-bottom:1px solid var(--border-color);">${l}</div>`
    ).join('');
}

function resetPool() {
    if (pool) {
        pool.terminate();
        pool = null;
    }
    logs.length = 0;
    elements.poolStatus.innerHTML = '<p>Pool reset</p>';
    elements.workersVisualization.innerHTML = '';
    elements.activityLog.innerHTML = '';
}

elements.addTaskBtn.addEventListener('click', addTask);
elements.addManyBtn.addEventListener('click', addManyTasks);
elements.resetBtn.addEventListener('click', resetPool);

initPool();
