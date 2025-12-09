// Semaphore Implementation - Worker Thread

let sharedArray = null;
let workerId = -1;
let startTime = 0;

// SharedArrayBuffer layout:
// [0] - Semaphore count (available permits)
// [1] - Waiting count
// [2] - Max concurrent observed
// [3+] - Worker states

const SEMAPHORE_INDEX = 0;
const WAITING_INDEX = 1;
const MAX_CONCURRENT_INDEX = 2;
const WORKER_STATE_OFFSET = 3;

// Worker states
const STATE_IDLE = 0;
const STATE_WAITING = 1;
const STATE_WORKING = 2;

self.onmessage = function(e) {
    const { type, sharedBuffer } = e.data;

    if (type === 'start') {
        workerId = e.data.workerId;
        sharedArray = new Int32Array(sharedBuffer);
        startTime = performance.now();

        const semaphore = new Semaphore(
            sharedArray,
            SEMAPHORE_INDEX,
            WAITING_INDEX,
            e.data.semaphoreMax
        );

        runTasks(
            semaphore,
            e.data.tasksPerWorker,
            e.data.taskDuration
        );
    }
};

// Counting Semaphore implementation using Atomics
class Semaphore {
    constructor(array, countIndex, waitingIndex, maxCount) {
        this.array = array;
        this.countIndex = countIndex;
        this.waitingIndex = waitingIndex;
        this.maxCount = maxCount;
    }

    acquire() {
        const waitStart = performance.now();

        // Increment waiting count
        Atomics.add(this.array, this.waitingIndex, 1);

        while (true) {
            // Try to get a permit
            const current = Atomics.load(this.array, this.countIndex);

            if (current > 0) {
                // Try to decrement the count
                const oldValue = Atomics.compareExchange(
                    this.array,
                    this.countIndex,
                    current,
                    current - 1
                );

                if (oldValue === current) {
                    // Successfully acquired a permit
                    Atomics.sub(this.array, this.waitingIndex, 1);

                    // Update max concurrent tracking
                    const inUse = this.maxCount - (current - 1);
                    const currentMax = Atomics.load(this.array, MAX_CONCURRENT_INDEX);
                    if (inUse > currentMax) {
                        Atomics.compareExchange(
                            this.array,
                            MAX_CONCURRENT_INDEX,
                            currentMax,
                            inUse
                        );
                    }

                    return performance.now() - waitStart;
                }
                // CAS failed, another thread got it first, retry
                continue;
            }

            // No permits available, wait
            // Wait until the count is no longer 0
            const result = Atomics.wait(this.array, this.countIndex, 0, 100);
            // result can be 'ok', 'not-equal', or 'timed-out'
            // We use timeout to periodically re-check in case of missed notifications
        }
    }

    release() {
        // Increment the count (release a permit)
        Atomics.add(this.array, this.countIndex, 1);

        // Notify one waiting thread
        Atomics.notify(this.array, this.countIndex, 1);
    }

    tryAcquire() {
        // Non-blocking acquire attempt
        const current = Atomics.load(this.array, this.countIndex);

        if (current > 0) {
            const oldValue = Atomics.compareExchange(
                this.array,
                this.countIndex,
                current,
                current - 1
            );
            return oldValue === current;
        }

        return false;
    }

    availablePermits() {
        return Atomics.load(this.array, this.countIndex);
    }
}

function runTasks(semaphore, tasksPerWorker, taskDuration) {
    let completedTasks = 0;
    let totalWaitTime = 0;

    const processTask = (taskNum) => {
        if (taskNum > tasksPerWorker) {
            // All tasks complete
            self.postMessage({
                type: 'complete',
                workerId,
                stats: {
                    completedTasks,
                    totalWaitTime,
                    avgWaitTime: completedTasks > 0 ? totalWaitTime / completedTasks : 0
                }
            });
            return;
        }

        // Update state to waiting
        Atomics.store(sharedArray, WORKER_STATE_OFFSET + workerId, STATE_WAITING);

        self.postMessage({
            type: 'waiting',
            workerId,
            time: performance.now() - startTime
        });

        // Acquire semaphore permit
        const waitTime = semaphore.acquire();
        totalWaitTime += waitTime;

        // Update state to working
        Atomics.store(sharedArray, WORKER_STATE_OFFSET + workerId, STATE_WORKING);

        self.postMessage({
            type: 'acquired',
            workerId,
            time: performance.now() - startTime,
            waitTime,
            taskNum,
            totalTasks: tasksPerWorker
        });

        // Simulate doing work with the resource
        simulateWork(taskDuration, (progress) => {
            self.postMessage({
                type: 'task_progress',
                workerId,
                progress
            });
        });

        completedTasks++;

        // Release semaphore permit
        semaphore.release();

        // Update state to idle
        Atomics.store(sharedArray, WORKER_STATE_OFFSET + workerId, STATE_IDLE);

        self.postMessage({
            type: 'released',
            workerId,
            time: performance.now() - startTime
        });

        // Schedule next task
        setTimeout(() => processTask(taskNum + 1), 10);
    };

    // Start processing tasks
    processTask(1);
}

function simulateWork(duration, progressCallback) {
    const startTime = performance.now();
    const endTime = startTime + duration;
    const updateInterval = 50; // Update progress every 50ms

    let lastUpdate = startTime;

    while (performance.now() < endTime) {
        // Busy work simulation
        let sum = 0;
        for (let i = 0; i < 10000; i++) {
            sum += Math.sqrt(i);
        }

        // Progress update
        const now = performance.now();
        if (now - lastUpdate > updateInterval) {
            const progress = ((now - startTime) / duration) * 100;
            progressCallback(Math.min(100, progress));
            lastUpdate = now;
        }
    }

    progressCallback(100);
}

// Alternative: Binary Semaphore (Mutex-like)
class BinarySemaphore {
    constructor(array, index) {
        this.array = array;
        this.index = index;
        Atomics.store(this.array, this.index, 1); // Initially available
    }

    acquire() {
        while (true) {
            const oldValue = Atomics.compareExchange(this.array, this.index, 1, 0);
            if (oldValue === 1) return;
            Atomics.wait(this.array, this.index, 0);
        }
    }

    release() {
        Atomics.store(this.array, this.index, 1);
        Atomics.notify(this.array, this.index, 1);
    }
}

// Alternative: Bounded Semaphore (prevents release beyond max)
class BoundedSemaphore {
    constructor(array, countIndex, maxIndex, maxCount) {
        this.array = array;
        this.countIndex = countIndex;
        this.maxIndex = maxIndex;
        Atomics.store(this.array, this.countIndex, maxCount);
        Atomics.store(this.array, this.maxIndex, maxCount);
    }

    acquire() {
        while (true) {
            const current = Atomics.load(this.array, this.countIndex);
            if (current > 0) {
                const oldValue = Atomics.compareExchange(
                    this.array, this.countIndex, current, current - 1
                );
                if (oldValue === current) return;
            }
            Atomics.wait(this.array, this.countIndex, 0, 100);
        }
    }

    release() {
        const max = Atomics.load(this.array, this.maxIndex);
        const current = Atomics.load(this.array, this.countIndex);

        if (current >= max) {
            throw new Error('Cannot release: semaphore at maximum count');
        }

        Atomics.add(this.array, this.countIndex, 1);
        Atomics.notify(this.array, this.countIndex, 1);
    }
}
