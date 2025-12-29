/**
 * #613 Atomics Add Worker
 * Worker performing atomic increments
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

        case 'increment':
            performIncrements(data.count);
            break;
    }
};

function performIncrements(count) {
    const startTime = performance.now();
    const reportInterval = Math.floor(count / 20);

    for (let i = 0; i < count; i++) {
        // Atomically add 1 to shared counter
        Atomics.add(sharedArray, 0, 1);

        // Report progress
        if (i % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                data: { percent: Math.floor((i / count) * 100) }
            });
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        data: {
            count,
            duration: endTime - startTime
        }
    });
}
