/**
 * #621 Barrier Worker
 */

let workerId, sharedArray, totalWorkers;

self.onmessage = function(e) {
    const { type, data } = e.data;
    if (type === 'init') {
        workerId = data.workerId;
        sharedArray = new Int32Array(data.buffer);
        totalWorkers = data.totalWorkers;
    } else if (type === 'start') {
        runPhases(data.phases);
    }
};

function barrier() {
    const gen = Atomics.load(sharedArray, 2);
    const waiting = Atomics.add(sharedArray, 1, 1) + 1;

    if (waiting === totalWorkers) {
        Atomics.add(sharedArray, 0, 1);
        Atomics.store(sharedArray, 1, 0);
        Atomics.add(sharedArray, 2, 1);
        Atomics.notify(sharedArray, 2);
    } else {
        Atomics.wait(sharedArray, 2, gen);
    }
}

function runPhases(count) {
    for (let phase = 1; phase <= count; phase++) {
        const workTime = 200 + Math.random() * 800;
        const start = performance.now();
        while (performance.now() - start < workTime) {}

        barrier();
        self.postMessage({ type: 'phase-complete', data: { phase } });
    }
    self.postMessage({ type: 'all-complete' });
}
