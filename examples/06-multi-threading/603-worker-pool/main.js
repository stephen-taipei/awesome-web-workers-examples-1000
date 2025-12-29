/**
 * #603 Worker Pool Pattern
 * Implements a fixed-size worker pool with task queue
 */

class WorkerPool {
    constructor(size, workerScript) {
        this.size = size;
        this.workerScript = workerScript;
        this.workers = [];
        this.availableWorkers = [];
        this.taskQueue = [];
        this.runningTasks = new Map();
        this.taskIdCounter = 0;
        this.onTaskComplete = null;
        this.onStatusChange = null;

        this.initialize();
    }

    initialize() {
        for (let i = 0; i < this.size; i++) {
            const worker = new Worker(this.workerScript);
            worker.id = i;

            worker.onmessage = (e) => this.handleMessage(worker, e);
            worker.onerror = (e) => this.handleError(worker, e);

            this.workers.push(worker);
            this.availableWorkers.push(worker);
        }
        this.notifyStatusChange();
    }

    submit(taskData) {
        const taskId = ++this.taskIdCounter;
        const task = { id: taskId, data: taskData, status: 'queued' };

        if (this.availableWorkers.length > 0) {
            this.executeTask(task);
        } else {
            this.taskQueue.push(task);
        }

        this.notifyStatusChange();
        return taskId;
    }

    executeTask(task) {
        const worker = this.availableWorkers.pop();
        task.status = 'running';
        task.workerId = worker.id;
        this.runningTasks.set(worker.id, task);

        worker.postMessage({
            type: 'execute',
            data: { taskId: task.id, ...task.data }
        });
        this.notifyStatusChange();
    }

    handleMessage(worker, event) {
        const { type, data } = event.data;
        const task = this.runningTasks.get(worker.id);

        if (type === 'complete' && task) {
            task.status = 'complete';
            task.result = data;
            this.runningTasks.delete(worker.id);
            this.availableWorkers.push(worker);

            if (this.onTaskComplete) {
                this.onTaskComplete(task);
            }

            // Process next task in queue
            if (this.taskQueue.length > 0) {
                const nextTask = this.taskQueue.shift();
                this.executeTask(nextTask);
            }

            this.notifyStatusChange();
        }
    }

    handleError(worker, error) {
        const task = this.runningTasks.get(worker.id);
        if (task) {
            task.status = 'error';
            task.error = error.message;
            this.runningTasks.delete(worker.id);

            if (this.onTaskComplete) {
                this.onTaskComplete(task);
            }
        }

        // Recreate worker
        const index = this.workers.indexOf(worker);
        worker.terminate();

        const newWorker = new Worker(this.workerScript);
        newWorker.id = worker.id;
        newWorker.onmessage = (e) => this.handleMessage(newWorker, e);
        newWorker.onerror = (e) => this.handleError(newWorker, e);

        this.workers[index] = newWorker;
        this.availableWorkers.push(newWorker);
        this.notifyStatusChange();
    }

    notifyStatusChange() {
        if (this.onStatusChange) {
            this.onStatusChange({
                poolSize: this.size,
                available: this.availableWorkers.length,
                busy: this.runningTasks.size,
                queued: this.taskQueue.length,
                runningTasks: Array.from(this.runningTasks.values()),
                queuedTasks: [...this.taskQueue]
            });
        }
    }

    terminate() {
        this.workers.forEach(w => w.terminate());
        this.workers = [];
        this.availableWorkers = [];
        this.taskQueue = [];
        this.runningTasks.clear();
    }

    getQueuedTasks() {
        return [...this.taskQueue];
    }
}

// UI Management
let pool = null;
let completedTasks = [];

const elements = {
    poolSize: document.getElementById('pool-size'),
    taskCount: document.getElementById('task-count'),
    startBtn: document.getElementById('start-btn'),
    clearBtn: document.getElementById('clear-btn'),
    poolStatus: document.getElementById('pool-status'),
    workersGrid: document.getElementById('workers-grid'),
    taskQueue: document.getElementById('task-queue'),
    resultSection: document.getElementById('result-section'),
    completedTasks: document.getElementById('completed-tasks')
};

function initPool() {
    const size = parseInt(elements.poolSize.value);
    if (pool) {
        pool.terminate();
    }

    completedTasks = [];
    pool = new WorkerPool(size, 'worker.js');

    pool.onStatusChange = updateStatus;
    pool.onTaskComplete = (task) => {
        completedTasks.push(task);
        updateCompleted();
    };
}

function submitTasks() {
    initPool();
    elements.resultSection.classList.remove('hidden');

    const taskCount = parseInt(elements.taskCount.value);
    for (let i = 0; i < taskCount; i++) {
        pool.submit({
            name: `Task ${i + 1}`,
            iterations: 100000 + Math.floor(Math.random() * 400000)
        });
    }
}

function updateStatus(status) {
    elements.poolStatus.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Pool Size:</span>
            <span class="stat-value">${status.poolSize}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Available:</span>
            <span class="stat-value">${status.available}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Busy:</span>
            <span class="stat-value">${status.busy}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Queued:</span>
            <span class="stat-value">${status.queued}</span>
        </div>
    `;

    // Workers grid
    let workersHtml = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:15px;">';
    for (let i = 0; i < status.poolSize; i++) {
        const running = status.runningTasks.find(t => t.workerId === i);
        const color = running ? 'var(--success-color)' : 'var(--secondary-color)';
        const text = running ? `#${running.id}` : 'Idle';
        workersHtml += `<div style="padding:10px 20px;background:${color};border-radius:8px;color:white;">W${i}: ${text}</div>`;
    }
    workersHtml += '</div>';
    elements.workersGrid.innerHTML = workersHtml;

    // Task queue
    if (status.queued > 0) {
        elements.taskQueue.innerHTML = status.queuedTasks.map(t =>
            `<span class="badge badge-secondary" style="margin:2px;">Task #${t.id}</span>`
        ).join('');
    } else {
        elements.taskQueue.innerHTML = '<span class="text-muted">Queue empty</span>';
    }
}

function updateCompleted() {
    const recent = completedTasks.slice(-10).reverse();
    elements.completedTasks.innerHTML = recent.map(t => `
        <div class="stat-item" style="margin-bottom:5px;">
            <span>Task #${t.id} (Worker ${t.workerId})</span>
            <span class="stat-value">${t.result?.duration?.toFixed(2) || 'N/A'} ms</span>
        </div>
    `).join('');
}

function clearPool() {
    if (pool) {
        pool.terminate();
        pool = null;
    }
    completedTasks = [];
    elements.poolStatus.innerHTML = '<p>Pool cleared</p>';
    elements.workersGrid.innerHTML = '';
    elements.taskQueue.innerHTML = '';
    elements.resultSection.classList.add('hidden');
}

elements.startBtn.addEventListener('click', submitTasks);
elements.clearBtn.addEventListener('click', clearPool);
