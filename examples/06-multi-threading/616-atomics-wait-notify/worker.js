/**
 * #616 Atomics Wait/Notify Worker
 * Worker that waits on shared memory
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

        case 'start-waiting':
            startWaiting();
            break;
    }
};

function startWaiting() {
    const currentValue = Atomics.load(sharedArray, 0);

    self.postMessage({
        type: 'waiting',
        data: { currentValue }
    });

    // Wait for the counter to change (with 5 second timeout)
    const result = Atomics.wait(sharedArray, 0, currentValue, 5000);

    if (result === 'ok') {
        // Woken by notify
        const newValue = Atomics.load(sharedArray, 0);
        self.postMessage({
            type: 'woken',
            data: { result, newValue }
        });
    } else if (result === 'timed-out') {
        self.postMessage({
            type: 'timeout',
            data: { result }
        });
    } else {
        // 'not-equal' - value already changed
        const newValue = Atomics.load(sharedArray, 0);
        self.postMessage({
            type: 'woken',
            data: { result, newValue }
        });
    }
}
