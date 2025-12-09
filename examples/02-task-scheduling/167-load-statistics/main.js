class WorkerPool {
    constructor(size = 4) {
        this.size = size;
        this.workers = [];
        this.taskQueue = [];
        this.stats = {
            totalTasks: 0,
            completedTasks: 0,
            totalDuration: 0,
            workerStats: []
        };

        this.init();
    }

    init() {
        for (let i = 0; i < this.size; i++) {
            const worker = new Worker('worker.js');
            const workerData = {
                id: i + 1,
                worker,
                status: 'idle',
                tasksCompleted: 0,
                totalWorkTime: 0,
                currentTaskStart: null
            };

            this.stats.workerStats.push(workerData);

            worker.onmessage = (e) => this.handleTaskCompletion(workerData, e.data);
            this.workers.push(workerData);
        }
        this.updateUI();
        this.createWorkerCards();
    }

    addTask(complexity) {
        const task = {
            id: ++this.stats.totalTasks,
            complexity,
            addedAt: Date.now()
        };
        this.taskQueue.push(task);
        this.processQueue();
        this.updateUI();
        log(`任務 #${task.id} (複雜度: ${complexity}) 已加入佇列`);
    }

    processQueue() {
        if (this.taskQueue.length === 0) return;

        const idleWorker = this.workers.find(w => w.status === 'idle');
        if (idleWorker) {
            const task = this.taskQueue.shift();
            this.assignTask(idleWorker, task);
        }
    }

    assignTask(workerData, task) {
        workerData.status = 'active';
        workerData.currentTaskStart = Date.now();
        workerData.worker.postMessage({ taskId: task.id, complexity: task.complexity });
        this.updateUI();
        this.updateWorkerCard(workerData);
    }

    handleTaskCompletion(workerData, result) {
        const { taskId, actualDuration } = result;

        workerData.status = 'idle';
        workerData.tasksCompleted++;
        workerData.totalWorkTime += actualDuration;
        workerData.currentTaskStart = null;

        this.stats.completedTasks++;
        this.stats.totalDuration += actualDuration;

        log(`任務 #${taskId} 完成，耗時 ${actualDuration.toFixed(1)}ms (Worker #${workerData.id})`);

        this.processQueue();
        this.updateUI();
        this.updateWorkerCard(workerData);
    }

    // UI Updates
    createWorkerCards() {
        const container = document.getElementById('workerContainer');
        container.innerHTML = '';
        this.workers.forEach(w => {
            const card = document.createElement('div');
            card.className = 'worker-stat-card';
            card.id = `worker-card-${w.id}`;
            card.innerHTML = this.getWorkerCardHTML(w);
            container.appendChild(card);
        });
        this.renderCharts(); // Initial chart render
    }

    updateWorkerCard(w) {
        const card = document.getElementById(`worker-card-${w.id}`);
        if (card) {
            card.innerHTML = this.getWorkerCardHTML(w);
            card.className = `worker-stat-card ${w.status === 'active' ? 'active' : ''}`;
        }
        this.renderCharts();
    }

    getWorkerCardHTML(w) {
        const avgTime = w.tasksCompleted > 0 ? (w.totalWorkTime / w.tasksCompleted).toFixed(1) : '-';
        return `
            <div class="worker-header">
                <span>Worker #${w.id}</span>
                <span class="status-badge">${w.status}</span>
            </div>
            <div class="worker-detail">
                <span>已完成任務</span>
                <strong>${w.tasksCompleted}</strong>
            </div>
            <div class="worker-detail">
                <span>總工作時間</span>
                <strong>${(w.totalWorkTime / 1000).toFixed(2)}s</strong>
            </div>
            <div class="worker-detail">
                <span>平均耗時</span>
                <strong>${avgTime} ms</strong>
            </div>
        `;
    }

    updateUI() {
        document.getElementById('totalTasks').textContent = this.stats.totalTasks;
        document.getElementById('completedTasks').textContent = this.stats.completedTasks;

        const avg = this.stats.completedTasks > 0
            ? (this.stats.totalDuration / this.stats.completedTasks).toFixed(1)
            : '-';
        document.getElementById('avgDuration').textContent = avg;

        const activeCount = this.workers.filter(w => w.status === 'active').length;
        document.getElementById('activeWorkers').textContent = `${activeCount}/${this.size}`;
    }

    renderCharts() {
        const container = document.getElementById('workerLoadChart');
        const maxTasks = Math.max(...this.workers.map(w => w.tasksCompleted), 1);

        container.innerHTML = this.workers.map(w => {
            const heightPercentage = (w.tasksCompleted / maxTasks) * 100;
            // Ensure a minimum height for visibility if count is 0 but we want to show the bar structure
            const displayHeight = w.tasksCompleted === 0 ? 1 : heightPercentage;

            return `
                <div class="bar-group">
                    <div class="bar-value">${w.tasksCompleted}</div>
                    <div class="bar" style="height: ${displayHeight}%"></div>
                    <div class="bar-label">W#${w.id}</div>
                </div>
            `;
        }).join('');
    }
}

const pool = new WorkerPool(4);

document.getElementById('addSmallTaskBtn').addEventListener('click', () => {
    pool.addTask(5); // ~500ms
});

document.getElementById('addLargeTaskBtn').addEventListener('click', () => {
    pool.addTask(20); // ~2000ms
});

document.getElementById('addRandomTasksBtn').addEventListener('click', () => {
    for(let i=0; i<50; i++) {
        const complexity = Math.floor(Math.random() * 15) + 1;
        pool.addTask(complexity);
    }
});

function log(msg) {
    const logContent = document.getElementById('logContent');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    logContent.prepend(entry); // Newest top
}
