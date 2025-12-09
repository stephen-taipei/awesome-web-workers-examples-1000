class WorkerPool {
    constructor(size, workerScript) {
        this.size = size;
        this.workerScript = workerScript;
        this.workers = [];
        this.queue = [];
        this.activeWorkers = new Set(); // Set of worker indices
        this.taskCallbacks = new Map(); // taskId -> { resolve, reject }

        this.init();
    }

    init() {
        // Terminate existing if any (re-init)
        this.terminate();

        for (let i = 0; i < this.size; i++) {
            const worker = new Worker(this.workerScript);
            worker.onmessage = (e) => this.onWorkerMessage(i, e);
            worker.onerror = (e) => this.onWorkerError(i, e);
            this.workers.push({
                id: i,
                ref: worker,
                idle: true
            });
        }
        this.onPoolChange && this.onPoolChange();
    }

    terminate() {
        this.workers.forEach(w => w.ref.terminate());
        this.workers = [];
        this.queue = [];
        this.activeWorkers.clear();
        this.taskCallbacks.clear();
    }

    run(taskData) {
        return new Promise((resolve, reject) => {
            const taskId = Math.random().toString(36).substr(2, 9);
            const task = { ...taskData, taskId };

            this.taskCallbacks.set(taskId, { resolve, reject });

            // Try to find idle worker
            const idleWorker = this.workers.find(w => w.idle);

            if (idleWorker) {
                this.dispatchTask(idleWorker, task);
            } else {
                this.queue.push(task);
                this.onQueueChange && this.onQueueChange();
            }
        });
    }

    dispatchTask(worker, task) {
        worker.idle = false;
        this.activeWorkers.add(worker.id);

        worker.ref.postMessage(task);

        this.onPoolChange && this.onPoolChange();
        this.onQueueChange && this.onQueueChange();
    }

    onWorkerMessage(workerId, e) {
        const { taskId, duration, completedAt } = e.data;

        const worker = this.workers[workerId];
        worker.idle = true;
        this.activeWorkers.delete(workerId);

        // Resolve promise
        const callback = this.taskCallbacks.get(taskId);
        if (callback) {
            callback.resolve({ taskId, workerId, duration });
            this.taskCallbacks.delete(taskId);
        }

        // Process next task if any
        if (this.queue.length > 0) {
            const nextTask = this.queue.shift();
            this.dispatchTask(worker, nextTask);
        } else {
            this.onPoolChange && this.onPoolChange();
        }
    }

    onWorkerError(workerId, e) {
        console.error(`Worker ${workerId} error:`, e);
        // In real app, might want to replace the worker
    }
}
