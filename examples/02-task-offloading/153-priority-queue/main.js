// Priority Definitions
const PRIORITY = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
};

const PRIORITY_LABELS = {
    3: 'High',
    2: 'Medium',
    1: 'Low'
};

const PRIORITY_CLASSES = {
    3: 'high',
    2: 'medium',
    1: 'low'
};

class PriorityWorkerPool {
    constructor(size = 2) {
        this.size = size;
        this.workers = [];
        this.queue = []; // Max heap or sorted array
        this.taskIdCounter = 0;

        for (let i = 0; i < size; i++) {
            const w = new Worker('worker.js');
            w.onmessage = (e) => this.handleTaskComplete(i, e.data);
            this.workers.push({
                id: i,
                worker: w,
                busy: false
            });
        }
        this.updateUI();
    }

    submitTask(priority, duration = 1000) {
        const task = {
            id: ++this.taskIdCounter,
            priority,
            duration,
            addedAt: Date.now()
        };

        // Insert into queue maintaining sort order (Higher priority first)
        // Stable sort for same priority (FCFS within priority)
        this.queue.push(task);
        this.queue.sort((a, b) => b.priority - a.priority);

        this.log(`Task #${task.id} (${PRIORITY_LABELS[priority]}) added.`);
        this.updateUI();
        this.processQueue();
    }

    processQueue() {
        const idleWorker = this.workers.find(w => !w.busy);
        if (idleWorker && this.queue.length > 0) {
            const task = this.queue.shift();
            idleWorker.busy = true;
            idleWorker.currentTask = task;

            this.log(`Worker ${idleWorker.id} started Task #${task.id} (${PRIORITY_LABELS[task.priority]})`);
            idleWorker.worker.postMessage(task);
            this.updateUI();
        }
    }

    handleTaskComplete(workerId, data) {
        const worker = this.workers[workerId];
        worker.busy = false;
        worker.currentTask = null;

        this.log(`Worker ${workerId} finished Task #${data.id}`);
        this.updateUI();
        this.processQueue();
    }

    log(msg) {
        const logPanel = document.getElementById('logPanel');
        const entry = document.createElement('div');
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        logPanel.prepend(entry);
    }

    updateUI() {
        // Update Worker List
        const list = document.getElementById('workerList');
        list.innerHTML = '';
        this.workers.forEach(w => {
            const card = document.createElement('div');
            card.className = `worker-card ${w.busy ? 'busy' : ''}`;
            let status = 'Idle';
            if (w.busy && w.currentTask) {
                status = `Busy\n#${w.currentTask.id} (${PRIORITY_LABELS[w.currentTask.priority]})`;
            }
            card.innerText = `Worker ${w.id}\n${status}`;
            list.appendChild(card);
        });

        // Update Queue
        document.getElementById('pendingCount').textContent = this.queue.length;
        const queueDiv = document.getElementById('taskQueue');
        queueDiv.innerHTML = this.queue.map(t => `
            <div class="task-item ${PRIORITY_CLASSES[t.priority]}">
                <span>Task #${t.id}</span>
                <span>${PRIORITY_LABELS[t.priority]}</span>
            </div>
        `).join('');
    }
}

const pool = new PriorityWorkerPool(2);

document.getElementById('addHighBtn').addEventListener('click', () => pool.submitTask(PRIORITY.HIGH, 1000));
document.getElementById('addMediumBtn').addEventListener('click', () => pool.submitTask(PRIORITY.MEDIUM, 1000));
document.getElementById('addLowBtn').addEventListener('click', () => pool.submitTask(PRIORITY.LOW, 1000));

document.getElementById('addMixedBtn').addEventListener('click', () => {
    // Add a mix of tasks in random order to demonstrate sorting
    const priorities = [
        PRIORITY.LOW, PRIORITY.LOW, PRIORITY.LOW,
        PRIORITY.MEDIUM, PRIORITY.MEDIUM,
        PRIORITY.HIGH
    ];

    // Shuffle
    priorities.sort(() => Math.random() - 0.5);

    priorities.forEach(p => {
        pool.submitTask(p, 500 + Math.random() * 1000);
    });
});
