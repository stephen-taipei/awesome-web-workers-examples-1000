/**
 * #615 Atomics Compare-Exchange Worker
 * Worker performing CAS operations
 */

let workerId = null;
let sharedArray = null;

self.onmessage = function(e) {
    const { type, data } = e.data;

    switch (type) {
        case 'init':
            workerId = data.workerId;
            sharedArray = new Int32Array(data.buffer);
            self.postMessage({ type: 'ready' });
            break;

        case 'cas':
            performCAS(data.expected, data.newValue);
            break;
    }
};

function performCAS(expected, newValue) {
    // Small random delay to make race more interesting
    const delay = Math.random() * 10;
    const start = performance.now();
    while (performance.now() - start < delay) {
        // Busy wait
    }

    const oldValue = Atomics.compareExchange(sharedArray, 0, expected, newValue);
    const success = oldValue === expected;

    self.postMessage({
        type: 'cas-result',
        data: {
            expected,
            newValue,
            oldValue,
            success
        }
    });
}
