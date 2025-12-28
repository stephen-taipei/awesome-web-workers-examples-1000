/**
 * #617 Mutex Worker
 * Worker with mutex lock capability
 */

let workerId = null;
let sharedArray = null;

const MUTEX_INDEX = 0;
const COUNTER_INDEX = 1;

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'init':
            workerId = data.workerId;
            sharedArray = new Int32Array(data.buffer);
            break;

        case 'start':
            runOperations(data.operations, data.useMutex);
            break;
    }
};

function lock() {
    // Spin until we acquire the lock
    while (Atomics.compareExchange(sharedArray, MUTEX_INDEX, 0, 1) !== 0) {
        // Busy wait - in real code, use Atomics.wait for efficiency
    }
    self.postMessage({ type: 'locked' });
}

function unlock() {
    Atomics.store(sharedArray, MUTEX_INDEX, 0);
    self.postMessage({ type: 'unlocked' });
}

function runOperations(count, useMutex) {
    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
        if (useMutex) {
            // Protected increment
            lock();

            // Critical section: read-modify-write
            const current = Atomics.load(sharedArray, COUNTER_INDEX);
            // Small delay to make race condition more likely without mutex
            const temp = current + 1;
            Atomics.store(sharedArray, COUNTER_INDEX, temp);

            unlock();
        } else {
            // Unprotected increment - will have race conditions!
            const current = Atomics.load(sharedArray, COUNTER_INDEX);
            // This delay makes race conditions very likely
            const temp = current + 1;
            Atomics.store(sharedArray, COUNTER_INDEX, temp);
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        data: {
            operations: count,
            duration: endTime - startTime
        }
    });
}
