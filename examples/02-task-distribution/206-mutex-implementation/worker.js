// Mutex Implementation - Worker Thread

let sharedArray = null;
let workerId = -1;
let startTime = 0;

// SharedArrayBuffer layout:
// [0] - Mutex state (0 = unlocked, 1 = locked)
// [1] - Counter without mutex
// [2] - Counter with mutex
// [3] - Current lock owner (-1 = none)
// [4] - Waiting count

const MUTEX_INDEX = 0;
const NO_MUTEX_COUNTER = 1;
const WITH_MUTEX_COUNTER = 2;
const OWNER_INDEX = 3;
const WAITING_INDEX = 4;

self.onmessage = function(e) {
    const { type, sharedBuffer } = e.data;

    if (type === 'start') {
        workerId = e.data.workerId;
        sharedArray = new Int32Array(sharedBuffer);
        startTime = performance.now();

        runTests(
            e.data.operationsCount,
            e.data.criticalWorkTime,
            e.data.useMutex
        );
    }
};

// Mutex implementation using Atomics
class Mutex {
    constructor(array, index, ownerIndex, waitingIndex) {
        this.array = array;
        this.index = index;
        this.ownerIndex = ownerIndex;
        this.waitingIndex = waitingIndex;
    }

    lock(ownerId) {
        const waitStart = performance.now();

        while (true) {
            // Try to acquire the lock: compare-and-swap 0 -> 1
            const oldValue = Atomics.compareExchange(this.array, this.index, 0, 1);

            if (oldValue === 0) {
                // Successfully acquired the lock
                Atomics.store(this.array, this.ownerIndex, ownerId);
                return performance.now() - waitStart;
            }

            // Lock is held by someone else, increment waiting count
            Atomics.add(this.array, this.waitingIndex, 1);

            // Wait until the lock value changes from 1
            // This blocks the thread efficiently (no busy spinning)
            Atomics.wait(this.array, this.index, 1);

            // Decrement waiting count
            Atomics.sub(this.array, this.waitingIndex, 1);
        }
    }

    unlock() {
        // Clear owner
        Atomics.store(this.array, this.ownerIndex, -1);

        // Release the lock
        Atomics.store(this.array, this.index, 0);

        // Wake up one waiting thread
        Atomics.notify(this.array, this.index, 1);
    }

    tryLock(ownerId) {
        // Non-blocking lock attempt
        const oldValue = Atomics.compareExchange(this.array, this.index, 0, 1);
        if (oldValue === 0) {
            Atomics.store(this.array, this.ownerIndex, ownerId);
            return true;
        }
        return false;
    }
}

function runTests(operationsCount, criticalWorkTime, useMutex) {
    if (useMutex === 'no' || useMutex === 'compare') {
        runWithoutMutex(operationsCount, criticalWorkTime);
    }

    if (useMutex === 'yes' || useMutex === 'compare') {
        runWithMutex(operationsCount, criticalWorkTime);
    }
}

function runWithoutMutex(operationsCount, criticalWorkTime) {
    let operations = 0;

    for (let i = 0; i < operationsCount; i++) {
        // Critical section WITHOUT mutex protection
        // This read-modify-write sequence is NOT atomic
        const current = sharedArray[NO_MUTEX_COUNTER];

        // Simulate some work in critical section
        if (criticalWorkTime > 0) {
            busyWait(criticalWorkTime);
        }

        sharedArray[NO_MUTEX_COUNTER] = current + 1;
        operations++;

        // Progress update
        if (i % 500 === 0) {
            self.postMessage({
                type: 'progress',
                workerId,
                testType: 'without mutex',
                completed: i,
                total: operationsCount
            });
        }
    }

    self.postMessage({
        type: 'complete',
        workerId,
        testType: 'without_mutex',
        stats: {
            operations,
            lockAcquires: 0,
            totalWait: 0
        }
    });
}

function runWithMutex(operationsCount, criticalWorkTime) {
    const mutex = new Mutex(sharedArray, MUTEX_INDEX, OWNER_INDEX, WAITING_INDEX);
    let operations = 0;
    let lockAcquires = 0;
    let totalWait = 0;

    for (let i = 0; i < operationsCount; i++) {
        // Acquire lock
        const lockStartTime = performance.now() - startTime;
        const waitTime = mutex.lock(workerId);
        totalWait += waitTime;
        lockAcquires++;

        // Report lock acquisition
        self.postMessage({
            type: 'lock_acquired',
            workerId,
            time: performance.now() - startTime,
            waitTime
        });

        const holdStart = performance.now();

        // Critical section WITH mutex protection
        // Only one worker can execute this at a time
        const current = Atomics.load(sharedArray, WITH_MUTEX_COUNTER);

        // Simulate some work in critical section
        if (criticalWorkTime > 0) {
            busyWait(criticalWorkTime);
        }

        Atomics.store(sharedArray, WITH_MUTEX_COUNTER, current + 1);
        operations++;

        const holdTime = performance.now() - holdStart;

        // Release lock
        mutex.unlock();

        // Report lock release
        self.postMessage({
            type: 'lock_released',
            workerId,
            time: performance.now() - startTime,
            holdTime
        });

        // Progress update
        if (i % 200 === 0) {
            self.postMessage({
                type: 'progress',
                workerId,
                testType: 'with mutex',
                completed: i,
                total: operationsCount
            });
        }
    }

    self.postMessage({
        type: 'complete',
        workerId,
        testType: 'with_mutex',
        stats: {
            operations,
            lockAcquires,
            totalWait
        }
    });
}

// Busy wait to simulate work
function busyWait(ms) {
    const end = performance.now() + ms;
    while (performance.now() < end) {
        // Busy loop
    }
}

// Alternative: Recursive mutex that allows same thread to acquire multiple times
class RecursiveMutex {
    constructor(array, lockIndex, ownerIndex, countIndex) {
        this.array = array;
        this.lockIndex = lockIndex;
        this.ownerIndex = ownerIndex;
        this.countIndex = countIndex;
    }

    lock(ownerId) {
        const currentOwner = Atomics.load(this.array, this.ownerIndex);

        if (currentOwner === ownerId) {
            // Already own the lock, increment count
            Atomics.add(this.array, this.countIndex, 1);
            return 0;
        }

        // Need to acquire lock
        while (true) {
            const oldValue = Atomics.compareExchange(this.array, this.lockIndex, 0, 1);
            if (oldValue === 0) {
                Atomics.store(this.array, this.ownerIndex, ownerId);
                Atomics.store(this.array, this.countIndex, 1);
                return 0;
            }
            Atomics.wait(this.array, this.lockIndex, 1);
        }
    }

    unlock(ownerId) {
        const currentOwner = Atomics.load(this.array, this.ownerIndex);
        if (currentOwner !== ownerId) {
            throw new Error('Cannot unlock mutex not owned by this thread');
        }

        const count = Atomics.sub(this.array, this.countIndex, 1);
        if (count === 1) {
            // Last unlock, release the lock
            Atomics.store(this.array, this.ownerIndex, -1);
            Atomics.store(this.array, this.lockIndex, 0);
            Atomics.notify(this.array, this.lockIndex, 1);
        }
    }
}
