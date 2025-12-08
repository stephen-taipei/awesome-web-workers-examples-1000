class WorkStealingScheduler {
    constructor(count = 4) {
        this.count = count;
        this.workers = [];
        this.taskIdCounter = 0;

        for (let i = 0; i < count; i++) {
            this.workers.push(new WorkerNode(i, this));
        }

        this.renderUI();
    }

    // Called by UI buttons
    addTaskToWorker(workerId, duration = 1000) {
        const task = {
            id: ++this.taskIdCounter,
            duration,
            originWorkerId: workerId, // Trace where it started
            stolen: false
        };
        this.workers[workerId].pushTask(task);

        // Notify other idle workers to try stealing
        this.notifyIdleWorkers();
    }

    notifyIdleWorkers() {
        this.workers.forEach(w => {
            if (!w.busy) {
                w.process();
            }
        });
    }

    // Work stealing logic: A worker asks the scheduler to find work
    stealWork(thiefId) {
        // Try to steal from a random victim, or iterate all
        // Strategy: Iterate to find the one with most tasks? Or just random?
        // Random is common in work stealing to avoid contention.
        // For visualization, let's try to steal from the one with most tasks.

        let maxTasks = 0;
        let victim = null;

        for (const w of this.workers) {
            if (w.id !== thiefId && w.deque.length > 0) {
                if (w.deque.length > maxTasks) {
                    maxTasks = w.deque.length;
                    victim = w;
                }
            }
        }

        if (victim) {
            // Steal from the BACK (tail) of the victim's deque
            // The victim pops from the FRONT (head) for its own execution.
            // This reduces contention.
            const task = victim.deque.pop(); // Taking from the end
            if (task) {
                task.stolen = true;
                // console.log(`Worker ${thiefId} stole Task ${task.id} from Worker ${victim.id}`);
                return task;
            }
        }
        return null;
    }

    renderUI() {
        const container = document.getElementById('workersContainer');
        container.innerHTML = '';
        this.workers.forEach(w => {
            container.appendChild(w.element);
        });
    }
}

class WorkerNode {
    constructor(id, scheduler) {
        this.id = id;
        this.scheduler = scheduler;
        this.worker = new Worker('worker.js');
        this.deque = []; // Array as Deque: push/shift for owner, pop for thief
        this.busy = false;
        this.currentTask = null;

        this.element = this.createUI();

        this.worker.onmessage = (e) => this.handleTaskComplete(e.data);
    }

    createUI() {
        const div = document.createElement('div');
        div.className = 'worker-column';
        div.innerHTML = `
            <div class="worker-header">
                <h3>Worker ${this.id}</h3>
                <div class="worker-status idle" id="status-${this.id}">Idle</div>
                <button class="add-task-btn" onclick="scheduler.addTaskToWorker(${this.id}, 1000)">Add Task</button>
            </div>
            <div class="local-queue" id="queue-${this.id}"></div>
        `;
        return div;
    }

    updateUI() {
        // Status
        const statusEl = this.element.querySelector(`#status-${this.id}`);
        statusEl.className = `worker-status ${this.busy ? 'busy' : 'idle'}`;
        statusEl.textContent = this.busy ? `Busy (Task #${this.currentTask.id})` : 'Idle';

        // Queue
        const queueEl = this.element.querySelector(`#queue-${this.id}`);
        queueEl.innerHTML = this.deque.map(t => `
            <div class="task-card ${t.stolen ? 'stolen' : ''}">
                Task #${t.id} ${t.stolen ? '(Stolen)' : ''}
            </div>
        `).join('');
    }

    pushTask(task) {
        this.deque.push(task); // Add to back
        this.updateUI();
        this.process();
    }

    process() {
        if (this.busy) return;

        // 1. Try to take from own queue (LIFO or FIFO? standard Deque for owner is usually LIFO for cache locality,
        // but FIFO feels more natural for a task queue. Let's do FIFO for owner: shift())
        if (this.deque.length > 0) {
            const task = this.deque.shift(); // Take from front
            this.execute(task);
        } else {
            // 2. Queue empty? Try to steal
            const stolenTask = this.scheduler.stealWork(this.id);
            if (stolenTask) {
                this.execute(stolenTask);
            }
        }
    }

    execute(task) {
        this.busy = true;
        this.currentTask = task;
        this.updateUI();
        this.worker.postMessage(task);
    }

    handleTaskComplete(data) {
        this.busy = false;
        this.currentTask = null;
        this.updateUI();

        // Check for more work immediately
        this.process();
    }
}

// Global instance
const scheduler = new WorkStealingScheduler(4);

// Helper functions for global buttons
function distributeRandomLoad() {
    for (let i = 0; i < 12; i++) {
        // Assign to random workers
        const workerId = Math.floor(Math.random() * 4);
        scheduler.addTaskToWorker(workerId, 500 + Math.random() * 1000);
    }
}

function floodWorker(id) {
    for (let i = 0; i < 10; i++) {
        scheduler.addTaskToWorker(id, 800);
    }
}
