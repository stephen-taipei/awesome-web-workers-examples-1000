// 主程式邏輯

class WorkerPool {
    constructor(size = 4) {
        this.size = size;
        this.workers = [];
        this.queue = [];
        this.tasks = new Map(); // Store task info
        this.workerStatus = new Map(); // Store worker status: { id, busy, taskId, progress }

        // Statistics
        this.stats = {
            totalTasks: 0,
            completedTasks: 0,
            totalTime: 0
        };

        this.init();
    }

    init() {
        for (let i = 0; i < this.size; i++) {
            this.addWorker();
        }
        this.startMonitoring();
    }

    addWorker() {
        const id = this.workers.length + 1;
        const worker = new Worker('worker.js');

        worker.onmessage = (e) => this.handleMessage(id, e.data);
        worker.onerror = (e) => console.error(`Worker ${id} error:`, e);

        this.workers.push({ id, worker, busy: false });
        this.workerStatus.set(id, { id, busy: false, taskId: null, progress: 0 });

        this.updateDashboard();
        this.log(`Worker ${id} started.`);
    }

    removeWorker() {
        if (this.workers.length === 0) return;

        // 嘗試移除空閒的 worker，如果都忙碌則移除最後一個
        let indexToRemove = this.workers.findIndex(w => !w.busy);
        if (indexToRemove === -1) indexToRemove = this.workers.length - 1;

        const workerObj = this.workers[indexToRemove];
        workerObj.worker.terminate();

        this.workers.splice(indexToRemove, 1);
        this.workerStatus.delete(workerObj.id);

        this.updateDashboard();
        this.log(`Worker ${workerObj.id} removed.`);
    }

    handleMessage(workerId, data) {
        const workerObj = this.workers.find(w => w.id === workerId);
        if (!workerObj) return;

        if (data.type === 'progress') {
            const status = this.workerStatus.get(workerId);
            status.progress = data.progress;
            this.workerStatus.set(workerId, status);
            this.updateWorkerCard(workerId); // 優化：只更新該 worker 的卡片
        } else if (data.type === 'complete') {
            const { taskId, duration } = data;

            workerObj.busy = false;
            const status = this.workerStatus.get(workerId);
            status.busy = false;
            status.taskId = null;
            status.progress = 0;
            this.workerStatus.set(workerId, status);

            this.stats.completedTasks++;
            this.stats.totalTime += duration;
            this.tasks.delete(taskId);

            this.log(`Task ${taskId} completed by Worker ${workerId} in ${duration}ms`);

            this.processQueue();
            this.updateDashboard();
        }
    }

    submitTask(task) {
        this.tasks.set(task.id, task);
        this.queue.push(task);
        this.stats.totalTasks++;
        this.log(`Task ${task.id} submitted (Duration: ${task.duration}ms)`);
        this.processQueue();
        this.updateDashboard();
    }

    processQueue() {
        if (this.queue.length === 0) return;

        const availableWorker = this.workers.find(w => !w.busy);
        if (availableWorker) {
            const task = this.queue.shift();
            availableWorker.busy = true;

            const status = this.workerStatus.get(availableWorker.id);
            status.busy = true;
            status.taskId = task.id;
            status.progress = 0;
            this.workerStatus.set(availableWorker.id, status);

            availableWorker.worker.postMessage({
                taskId: task.id,
                duration: task.duration,
                type: 'compute'
            });

            this.updateDashboard();
        }
    }

    // --- UI Updates & Monitoring ---

    updateDashboard() {
        // Update Stats
        document.getElementById('workerCountDisplay').textContent = this.workers.length;
        document.getElementById('pendingTasksDisplay').textContent = this.queue.length;
        document.getElementById('activeTasksDisplay').textContent = this.workers.filter(w => w.busy).length;
        document.getElementById('completedTasksDisplay').textContent = this.stats.completedTasks;
        document.getElementById('totalTimeDisplay').textContent = (this.stats.totalTime / 1000).toFixed(1) + 's';

        // Update Worker List
        this.renderWorkerList();
    }

    renderWorkerList() {
        const container = document.getElementById('workerList');
        // Simple diffing: if count matches, just update content logic handled by specific update
        // For simplicity in this demo, we'll rebuild if length changes, otherwise update

        const cards = container.getElementsByClassName('worker-card');
        if (cards.length !== this.workers.length) {
            container.innerHTML = '';
            this.workers.forEach(w => {
                const status = this.workerStatus.get(w.id);
                const card = document.createElement('div');
                card.className = `worker-card ${status.busy ? 'busy' : 'idle'}`;
                card.id = `worker-card-${w.id}`;
                card.innerHTML = this.getWorkerCardHTML(status);
                container.appendChild(card);
            });
        } else {
            this.workers.forEach(w => {
                this.updateWorkerCard(w.id);
            });
        }
    }

    getWorkerCardHTML(status) {
        const statusText = status.busy ? 'BUSY' : 'IDLE';
        const taskText = status.busy ? `Processing Task #${status.taskId}` : 'Waiting for tasks';
        const progress = status.busy ? status.progress : 0;

        return `
            <h4>Worker #${status.id} <span class="worker-status">${statusText}</span></h4>
            <div class="worker-info">${taskText}</div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
        `;
    }

    updateWorkerCard(workerId) {
        const card = document.getElementById(`worker-card-${workerId}`);
        if (!card) return; // Should not happen if logic is correct

        const status = this.workerStatus.get(workerId);

        // Update class
        card.className = `worker-card ${status.busy ? 'busy' : 'idle'}`;

        // Update HTML content
        card.innerHTML = this.getWorkerCardHTML(status);
    }

    log(message) {
        const logPanel = document.getElementById('logOutput');
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        const time = new Date().toLocaleTimeString();
        entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
        logPanel.prepend(entry);

        // Keep log size manageable
        if (logPanel.children.length > 50) {
            logPanel.removeChild(logPanel.lastChild);
        }
    }

    startMonitoring() {
        const canvas = document.getElementById('monitorCanvas');
        const ctx = canvas.getContext('2d');
        const historyLength = 200; // frames
        const history = [];

        const draw = () => {
            // Collect current state
            const activeWorkers = this.workers.filter(w => w.busy).length;
            const queueLength = this.queue.length;

            history.push({ active: activeWorkers, queue: queueLength });
            if (history.length > historyLength) history.shift();

            // Clear
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Background Grid
            ctx.strokeStyle = '#eee';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(let i=0; i<canvas.width; i+=40) { ctx.moveTo(i,0); ctx.lineTo(i, canvas.height); }
            for(let i=0; i<canvas.height; i+=40) { ctx.moveTo(0,i); ctx.lineTo(canvas.width, i); }
            ctx.stroke();

            if (history.length < 2) {
                requestAnimationFrame(draw);
                return;
            }

            const stepX = canvas.width / historyLength;

            // Draw Queue Length (Red Line)
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, canvas.height - (history[0].queue * 10)); // Scale factor 10
            for (let i = 1; i < history.length; i++) {
                ctx.lineTo(i * stepX, canvas.height - Math.min(canvas.height, history[i].queue * 10));
            }
            ctx.stroke();

            // Draw Active Workers (Blue Area)
            ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
            ctx.strokeStyle = '#2980b9';
            ctx.beginPath();
            ctx.moveTo(0, canvas.height);
            for (let i = 0; i < history.length; i++) {
                const h = (history[i].active / Math.max(1, this.workers.length)) * (canvas.height * 0.8); // Scale to 80% height max
                ctx.lineTo(i * stepX, canvas.height - h);
            }
            ctx.lineTo((history.length - 1) * stepX, canvas.height);
            ctx.fill();

            // Legend
            ctx.fillStyle = '#e74c3c';
            ctx.fillText('Queue Size', 10, 20);
            ctx.fillStyle = '#2980b9';
            ctx.fillText('Active Workers', 10, 40);

            requestAnimationFrame(draw);
        };
        draw();
    }
}

// Application Logic
const pool = new WorkerPool(4);
let taskIdCounter = 1;
let autoTaskInterval = null;

document.getElementById('addWorkerBtn').addEventListener('click', () => {
    pool.addWorker();
});

document.getElementById('removeWorkerBtn').addEventListener('click', () => {
    pool.removeWorker();
});

document.getElementById('addTaskBtn').addEventListener('click', () => {
    const duration = Math.floor(Math.random() * 2000) + 1000; // 1-3 seconds
    pool.submitTask({ id: taskIdCounter++, duration });
});

document.getElementById('addBatchTaskBtn').addEventListener('click', () => {
    for(let i=0; i<10; i++) {
        const duration = Math.floor(Math.random() * 2000) + 500;
        pool.submitTask({ id: taskIdCounter++, duration });
    }
});

document.getElementById('toggleAutoTaskBtn').addEventListener('click', function() {
    if (autoTaskInterval) {
        clearInterval(autoTaskInterval);
        autoTaskInterval = null;
        this.textContent = '開啟自動投遞任務';
        this.classList.remove('active');
    } else {
        autoTaskInterval = setInterval(() => {
            if (pool.queue.length < 50) { // 防止溢出
                const duration = Math.floor(Math.random() * 3000) + 500;
                pool.submitTask({ id: taskIdCounter++, duration });
            }
        }, 500);
        this.textContent = '停止自動投遞任務';
        this.classList.add('active');
    }
});
