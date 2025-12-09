class FairScheduler {
    constructor(workerCount = 1) {
        this.workers = [];
        this.queues = {
            'A': [],
            'B': [],
            'C': []
        };
        // Round-robin pointer
        this.userKeys = ['A', 'B', 'C'];
        this.currentUserIndex = 0;

        this.taskIdCounter = 0;

        for (let i = 0; i < workerCount; i++) {
            const w = new Worker('worker.js');
            w.onmessage = (e) => this.handleTaskComplete(i, e.data);
            this.workers.push({
                id: i,
                worker: w,
                busy: false,
                currentTask: null
            });
        }
        this.updateUI();
    }

    addTask(userId, duration) {
        const task = {
            id: ++this.taskIdCounter,
            userId,
            duration
        };
        this.queues[userId].push(task);
        this.updateUI();
        this.processQueue();
    }

    getNextTask() {
        // Fair scheduling: Check queues in Round Robin order
        // starting from the last served user
        let checkedCount = 0;
        while (checkedCount < this.userKeys.length) {
            const userId = this.userKeys[this.currentUserIndex];
            if (this.queues[userId].length > 0) {
                // Found a task
                const task = this.queues[userId].shift();

                // Move pointer to next user for next time
                this.currentUserIndex = (this.currentUserIndex + 1) % this.userKeys.length;
                return task;
            }

            // Move to next user
            this.currentUserIndex = (this.currentUserIndex + 1) % this.userKeys.length;
            checkedCount++;
        }
        return null;
    }

    processQueue() {
        // Find idle workers
        const idleWorker = this.workers.find(w => !w.busy);

        if (idleWorker) {
            const task = this.getNextTask();
            if (task) {
                idleWorker.busy = true;
                idleWorker.currentTask = task;
                idleWorker.worker.postMessage(task);
                this.updateUI();
            }
        }
    }

    handleTaskComplete(workerId, data) {
        const worker = this.workers[workerId];
        worker.busy = false;
        worker.currentTask = null;
        this.updateUI();
        this.processQueue();
    }

    updateUI() {
        // Update Workers
        const list = document.getElementById('workerList');
        list.innerHTML = '';
        this.workers.forEach(w => {
            const card = document.createElement('div');
            let className = 'worker-card ';
            let text = `Worker ${w.id}<br>Idle`;

            if (w.busy && w.currentTask) {
                className += `busy-user-${w.currentTask.userId.toLowerCase()}`;
                text = `Worker ${w.id}<br>Task #${w.currentTask.id}<br>(User ${w.currentTask.userId})`;
            } else {
                className += 'idle';
            }

            card.className = className;
            card.innerHTML = text;
            list.appendChild(card);
        });

        // Update Queues
        ['A', 'B', 'C'].forEach(user => {
            const container = document.getElementById(`queue${user}`);
            container.innerHTML = this.queues[user].map(t =>
                `<div class="queue-item user-${user.toLowerCase()}">${t.id}</div>`
            ).join('');
        });

        // Show projected execution order (simulation)
        // Note: destructive simulation not efficient for UI, just peeking
        // We can just show that it picks round robin
    }
}

const scheduler = new FairScheduler(1); // Single worker to demonstrate ordering clearly
// You can change to 2 workers to see parallelism while keeping fairness
