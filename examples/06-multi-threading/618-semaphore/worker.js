/**
 * #618 Semaphore Worker
 * Worker that acquires/releases semaphore permits
 */

let workerId = null;
let sharedArray = null;

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'init':
            workerId = data.workerId;
            sharedArray = new Int32Array(data.buffer);
            break;

        case 'start':
            accessResource();
            break;
    }
};

function acquire() {
    self.postMessage({ type: 'waiting' });

    // Try to acquire a permit
    while (true) {
        const current = Atomics.load(sharedArray, 0);
        if (current > 0) {
            // Try to decrement
            if (Atomics.compareExchange(sharedArray, 0, current, current - 1) === current) {
                // Successfully acquired
                return;
            }
        }
        // Spin wait briefly before retry
        // In production, use Atomics.wait
    }
}

function release() {
    Atomics.add(sharedArray, 0, 1);
    // In production, use Atomics.notify to wake waiters
}

function accessResource() {
    // Acquire permit
    acquire();
    self.postMessage({ type: 'acquired' });

    // Simulate using the resource (random 1-3 seconds)
    const useTime = 1000 + Math.random() * 2000;
    const start = performance.now();
    while (performance.now() - start < useTime) {
        // Simulate work
    }

    // Release permit
    release();
    self.postMessage({ type: 'released' });
}
