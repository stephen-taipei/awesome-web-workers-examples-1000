/**
 * #622 Countdown Latch Worker
 */

let workerId, sharedArray;

self.onmessage = function(e) {
    const { type, data } = e.data;
    if (type === 'init') {
        workerId = data.workerId;
        sharedArray = new Int32Array(data.buffer);
    } else if (type === 'start') {
        doWork();
    } else if (type === 'wait') {
        waitForLatch();
    }
};

function doWork() {
    const workTime = 500 + Math.random() * 2000;
    const start = performance.now();
    while (performance.now() - start < workTime) {}

    const remaining = Atomics.sub(sharedArray, 0, 1) - 1;
    self.postMessage({ type: 'countdown', data: { remaining } });

    if (remaining === 0) {
        Atomics.notify(sharedArray, 0);
    }
}

function waitForLatch() {
    while (Atomics.load(sharedArray, 0) > 0) {
        Atomics.wait(sharedArray, 0, Atomics.load(sharedArray, 0), 100);
    }
    self.postMessage({ type: 'latch-opened' });
}
