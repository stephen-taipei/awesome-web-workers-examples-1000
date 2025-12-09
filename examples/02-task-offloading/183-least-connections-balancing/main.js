class LoadBalancer {
    constructor(workerCount = 4) {
        this.workers = [];
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
                <div class="worker-icon">⚖️</div>
                <div>Worker #${workerId}</div>
                <div class="stats">Active: <span class="active-count" id="active-${workerId}">0</span></div>
                <div class="task-queue" id="queue-${workerId}"></div>
            `;
            container.appendChild(el);

            // Worker Object
            this.workers.push({
                id: workerId,
                worker: worker,
                element: el,
                activeCountElement: el.querySelector(`#active-${workerId}`),
                queueElement: el.querySelector(`#queue-${workerId}`),
                activeTasks: 0 // Track active connections
            });

            worker.onmessage = (e) => this.handleTaskComplete(workerId, e.data);
        }
    }

    addTask() {
        const taskId = this.taskCounter++;
        // Random duration to simulate uneven workload
        const duration = Math.floor(Math.random() * 4000) + 1000;

        // Least Connections Selection
        // Sort workers by activeTasks and pick the first one
        // If tie, just pick the first one encountered (or could be round-robin among ties)
        let selectedWorker = this.workers[0];
        for (let i = 1; i < this.workers.length; i++) {
            if (this.workers[i].activeTasks < selectedWorker.activeTasks) {
                selectedWorker = this.workers[i];
            }
        }

        this.assignTask(selectedWorker, taskId, duration);
    }

    assignTask(workerObj, taskId, duration) {
        // Visual feedback
        this.workers.forEach(w => w.element.classList.remove('selected'));
        workerObj.element.classList.add('selected');

        // Update state
        workerObj.activeTasks++;
        workerObj.activeCountElement.textContent = workerObj.activeTasks;
        workerObj.element.classList.add('active');

        // Add to visual queue
        const taskEl = document.createElement('div');
        taskEl.className = 'task-item';
        taskEl.id = `task-${taskId}`;
        taskEl.textContent = `Task #${taskId} (${(duration/1000).toFixed(1)}s)`;
        workerObj.queueElement.appendChild(taskEl);

        // Send to worker
        workerObj.worker.postMessage({ taskId, duration });

        this.log(`Assigned Task #${taskId} to Worker #${workerObj.id} (Active: ${workerObj.activeTasks})`);
    }

    handleTaskComplete(workerId, data) {
        const workerObj = this.workers.find(w => w.id === workerId);
        const taskEl = workerObj.queueElement.querySelector(`#task-${data.taskId}`);

        if (taskEl) {
            taskEl.remove();
        }

        // Update state
        workerObj.activeTasks--;
        workerObj.activeCountElement.textContent = workerObj.activeTasks;

        if (workerObj.activeTasks === 0) {
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
        this.style.background = '#e83e8c';
    } else {
        autoInterval = setInterval(() => lb.addTask(), 800);
        this.textContent = '停止模擬';
        this.style.background = '#dc3545';
    }
});
