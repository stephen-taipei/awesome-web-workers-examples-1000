class WorkerPool {
    constructor(minWorkers = 2, maxWorkers = 8) {
        this.minWorkers = minWorkers;
        this.maxWorkers = maxWorkers;
        this.workers = []; // Array of { id, worker, busy, lastActive }
        this.queue = [];
        this.taskIdCounter = 0;
        this.workerIdCounter = 0;
        this.scaleCheckInterval = null;
        this.completedTasks = 0;

        // Initialize min workers
        for (let i = 0; i < minWorkers; i++) {
            this.addWorker();
        }

        // Start auto-scaling monitoring
        this.startMonitoring();
    }

    addWorker() {
        if (this.workers.length >= this.maxWorkers) return null;

        const id = ++this.workerIdCounter;
        const worker = new Worker('worker.js');
        const workerData = {
            id,
            worker,
            busy: false,
            lastActive: Date.now()
        };

        worker.onmessage = (e) => {
            this.handleWorkerMessage(workerData, e.data);
        };

        this.workers.push(workerData);
        this.updateUI();
        return workerData;
    }

    removeWorker(workerData) {
        if (this.workers.length <= this.minWorkers) return;

        workerData.worker.terminate();
        this.workers = this.workers.filter(w => w.id !== workerData.id);
        this.updateUI();
    }

    handleWorkerMessage(workerData, data) {
        if (data.status === 'completed') {
            workerData.busy = false;
            workerData.lastActive = Date.now();
            this.completedTasks++;
            this.updateUI();

            // Try to assign next task
            this.processQueue();
        }
    }

    submitTask(duration) {
        const task = {
            id: ++this.taskIdCounter,
            duration,
            addedAt: Date.now()
        };
        this.queue.push(task);
        this.updateUI();
        this.processQueue();
    }

    processQueue() {
        if (this.queue.length === 0) return;

        // Find idle worker
        const idleWorker = this.workers.find(w => !w.busy);

        if (idleWorker) {
            const task = this.queue.shift();
            idleWorker.busy = true;
            idleWorker.worker.postMessage(task);
            this.updateUI();
        } else {
            // No idle worker, check if we can scale up
            // Simple threshold: if queue length > 0 and we have capacity, add worker
            // More complex logic: if queue length / worker count > threshold
            this.checkScaleUp();
        }
    }

    checkScaleUp() {
        // If all workers are busy and queue is backing up, try to add a worker
        const allBusy = this.workers.every(w => w.busy);
        if (allBusy && this.queue.length > 0 && this.workers.length < this.maxWorkers) {
             // Heuristic: Add a worker if queue has more than 2 tasks per existing worker
             // OR just aggressively add if tasks are waiting and we have room
             if (this.queue.length >= 2) {
                 const newWorker = this.addWorker();
                 if (newWorker) {
                     // Immediately try to use the new worker
                     this.processQueue();
                 }
             }
        }
    }

    checkScaleDown() {
        // If we have more than min workers, check for idle ones to remove
        if (this.workers.length > this.minWorkers) {
            const now = Date.now();
            const idleTimeout = 3000; // 3 seconds idle to remove

            // Find a candidate to remove: Idle and idle for > timeout
            // Sort by lastActive so we remove the one idle the longest?
            // Or simple check.
            const candidateIndex = this.workers.findIndex(w =>
                !w.busy && (now - w.lastActive > idleTimeout)
            );

            if (candidateIndex !== -1) {
                // Ensure we don't drop below minWorkers
                if (this.workers.length > this.minWorkers) {
                    this.removeWorker(this.workers[candidateIndex]);
                }
            }
        }
    }

    startMonitoring() {
        this.scaleCheckInterval = setInterval(() => {
            this.checkScaleUp();
            this.checkScaleDown();
        }, 1000);
    }

    updateUI() {
        // Worker Count
        document.getElementById('workerCount').textContent = this.workers.length;

        // Worker List
        const list = document.getElementById('workerList');
        list.innerHTML = '';
        this.workers.forEach(w => {
            const card = document.createElement('div');
            card.className = `worker-card ${w.busy ? 'busy' : 'idle'}`;
            card.textContent = `Worker ${w.id}\n${w.busy ? 'Busy' : 'Idle'}`;
            list.appendChild(card);
        });

        // Queue Stats
        document.getElementById('pendingCount').textContent = this.queue.length;
        document.getElementById('completedCount').textContent = this.completedTasks;

        // Queue List (Show top 5)
        const queueDiv = document.getElementById('taskQueue');
        queueDiv.innerHTML = this.queue.slice(0, 5).map(t =>
            `<div class="task-item">Task #${t.id} (${t.duration}ms)</div>`
        ).join('') + (this.queue.length > 5 ? '<div>...</div>' : '');
    }
}

// Init
const pool = new WorkerPool(2, 8);

document.getElementById('addTaskBtn').addEventListener('click', () => {
    pool.submitTask(500);
});

document.getElementById('addLongTaskBtn').addEventListener('click', () => {
    pool.submitTask(2000);
});

document.getElementById('addBurstBtn').addEventListener('click', () => {
    for(let i=0; i<20; i++) {
        pool.submitTask(500 + Math.random() * 500);
    }
});
