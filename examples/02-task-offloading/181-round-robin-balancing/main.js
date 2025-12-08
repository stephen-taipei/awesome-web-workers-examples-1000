class LoadBalancer {
    constructor(workerCount = 4) {
        this.workers = [];
        this.currentIndex = 0; // Round-robin index
        this.taskCounter = 1;
        this.initWorkers(workerCount);
    }

    initWorkers(count) {
        const container = document.getElementById('workersContainer');
        for (let i = 0; i < count; i++) {
            const worker = new Worker('worker.js');
            const workerId = i + 1;

            // UI Element
            const el = document.createElement('div');
            el.className = 'worker-node';
            el.id = `worker-${workerId}`;
            el.innerHTML = `
                <div class="worker-icon">⚙️</div>
                <div>Worker #${workerId}</div>
                <div class="stats">Tasks: <span class="task-count" id="count-${workerId}">0</span></div>
                <div class="task-queue" id="queue-${workerId}"></div>
            `;
            container.appendChild(el);

            // Worker Object
            this.workers.push({
                id: workerId,
                worker: worker,
                element: el,
                countElement: el.querySelector(`#count-${workerId}`),
                queueElement: el.querySelector(`#queue-${workerId}`),
                taskCount: 0
            });

            worker.onmessage = (e) => this.handleTaskComplete(workerId, e.data);
        }
    }

    addTask() {
        const taskId = this.taskCounter++;
        const duration = Math.floor(Math.random() * 2000) + 1000;

        // Round-robin selection
        const workerObj = this.workers[this.currentIndex];

        // Update index for next task
        this.currentIndex = (this.currentIndex + 1) % this.workers.length;

        this.assignTask(workerObj, taskId, duration);
    }

    assignTask(workerObj, taskId, duration) {
        // Visual feedback for selection
        this.workers.forEach(w => w.element.classList.remove('selected'));
        workerObj.element.classList.add('selected');

        // Update state
        workerObj.taskCount++;
        workerObj.countElement.textContent = workerObj.taskCount;
        workerObj.element.classList.add('active');

        // Add to visual queue
        const taskEl = document.createElement('div');
        taskEl.className = 'task-item';
        taskEl.id = `task-${taskId}`;
        taskEl.textContent = `Task #${taskId} (${(duration/1000).toFixed(1)}s)`;
        workerObj.queueElement.appendChild(taskEl);

        // Send to worker
        workerObj.worker.postMessage({ taskId, duration });

        this.log(`Distributed Task #${taskId} to Worker #${workerObj.id} (Round-robin)`);
    }

    handleTaskComplete(workerId, data) {
        const workerObj = this.workers.find(w => w.id === workerId);
        const taskEl = workerObj.queueElement.querySelector(`#task-${data.taskId}`);

        if (taskEl) {
            taskEl.remove();
        }

        // Check if idle
        if (workerObj.queueElement.children.length === 0) {
            workerObj.element.classList.remove('active');
        }

        this.log(`Worker #${workerId} completed Task #${data.taskId}`);
    }

    log(msg) {
        const log = document.getElementById('logArea');
        const line = document.createElement('div');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        log.prepend(line);
    }
}

const lb = new LoadBalancer(4);
let autoInterval = null;

document.getElementById('addTaskBtn').addEventListener('click', () => lb.addTask());

document.getElementById('autoTaskBtn').addEventListener('click', function() {
    if (autoInterval) {
        clearInterval(autoInterval);
        autoInterval = null;
        this.textContent = '自動模擬流量';
        this.style.background = '#007bff';
    } else {
        autoInterval = setInterval(() => lb.addTask(), 800);
        this.textContent = '停止模擬';
        this.style.background = '#dc3545';
    }
});
