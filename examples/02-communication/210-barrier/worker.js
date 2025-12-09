// Barrier Synchronization - Web Worker

// SharedArrayBuffer layout:
// [0]: count (threads at barrier)
// [1]: phase (current phase number)
// [2]: total (total thread count)
// [3]: sense (toggling flag for reusable barrier)
const COUNT = 0;
const PHASE = 1;
const TOTAL = 2;
const SENSE = 3;

let sharedArray = null;
let workerId = '';
let workerIndex = 0;
let localSense = 0;

self.onmessage = function(e) {
    const data = e.data;

    if (data.type === 'start') {
        sharedArray = new Int32Array(data.buffer);
        workerId = data.workerId;
        workerIndex = data.workerIndex;

        runWorker(data.phases, data.baseWork, data.workVariance);
    }
};

function runWorker(phases, baseWork, workVariance) {
    const total = Atomics.load(sharedArray, TOTAL);

    for (let phase = 0; phase < phases; phase++) {
        self.postMessage({
            type: 'log',
            message: `Starting phase ${phase + 1}`,
            state: 'working'
        });

        self.postMessage({ type: 'working' });

        // Simulate work with variable duration
        const workStart = performance.now();
        const variance = (Math.random() - 0.5) * 2 * (workVariance / 100) * baseWork;
        const workTime = baseWork + variance;
        busyWait(workTime);
        const actualWorkTime = performance.now() - workStart;

        self.postMessage({
            type: 'log',
            message: `Completed work for phase ${phase + 1} (${actualWorkTime.toFixed(0)}ms)`,
            state: 'waiting'
        });

        self.postMessage({ type: 'waiting' });
        self.postMessage({
            type: 'barrierReached',
            phase
        });

        // Wait at barrier
        const waitStart = performance.now();
        barrier(total);
        const waitTime = performance.now() - waitStart;

        self.postMessage({
            type: 'barrierReleased',
            phase: phase + 1
        });

        self.postMessage({
            type: 'phaseComplete',
            phase,
            workTime: actualWorkTime,
            waitTime
        });
    }

    self.postMessage({
        type: 'complete',
        phases
    });
}

// Sense-reversing barrier implementation
function barrier(total) {
    // Toggle local sense
    localSense = 1 - localSense;

    // Atomically increment count
    const arrived = Atomics.add(sharedArray, COUNT, 1) + 1;

    if (arrived === total) {
        // Last thread to arrive
        // Reset count for next barrier
        Atomics.store(sharedArray, COUNT, 0);

        // Increment phase
        Atomics.add(sharedArray, PHASE, 1);

        // Toggle global sense to release all waiting threads
        Atomics.store(sharedArray, SENSE, localSense);

        // Wake all waiting threads
        Atomics.notify(sharedArray, SENSE);
    } else {
        // Wait for sense to change
        while (Atomics.load(sharedArray, SENSE) !== localSense) {
            Atomics.wait(sharedArray, SENSE, 1 - localSense, 100);
        }
    }
}

function busyWait(ms) {
    const start = performance.now();
    while (performance.now() - start < ms) {
        // Busy wait with some actual computation
        let x = 0;
        for (let i = 0; i < 1000; i++) {
            x += Math.sin(i);
        }
    }
}
