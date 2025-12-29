/**
 * #620 Spinlock Worker
 * Worker with spinlock implementation
 */

let workerId = null;
let sharedArray = null;

const LOCK_INDEX = 0;
const COUNTER_INDEX = 1;
const SPIN_COUNT_INDEX = 2;

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'init':
            workerId = data.workerId;
            sharedArray = new Int32Array(data.buffer);
            break;

        case 'start':
            runIterations(data.iterations);
            break;
    }
};

function spinLock() {
    let spins = 0;
    const reportInterval = 1000;

    // Spin until we acquire the lock
    while (Atomics.compareExchange(sharedArray, LOCK_INDEX, 0, 1) !== 0) {
        spins++;
        Atomics.add(sharedArray, SPIN_COUNT_INDEX, 1);

        // Report spinning periodically
        if (spins % reportInterval === 0) {
            self.postMessage({
                type: 'spinning',
                data: { spins }
            });
        }
    }

    return spins;
}

function spinUnlock() {
    Atomics.store(sharedArray, LOCK_INDEX, 0);
}

function runIterations(count) {
    const startTime = performance.now();
    let totalSpins = 0;

    for (let i = 0; i < count; i++) {
        // Acquire spinlock
        totalSpins += spinLock();
        self.postMessage({ type: 'acquired' });

        // Critical section: increment counter
        const current = Atomics.load(sharedArray, COUNTER_INDEX);
        Atomics.store(sharedArray, COUNTER_INDEX, current + 1);

        // Release spinlock
        spinUnlock();
        self.postMessage({ type: 'released' });
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        data: {
            iterations: count,
            totalSpins,
            duration: endTime - startTime
        }
    });
}
