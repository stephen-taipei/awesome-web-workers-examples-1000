/**
 * #502 Memory Benchmark - Worker Thread
 * Performs memory allocation and access benchmarks
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'START') {
        runBenchmark(payload.size);
    }
};

function runBenchmark(size) {
    const startTime = performance.now();

    sendProgress(0, 'Starting memory benchmark...');

    // Allocation benchmark
    sendProgress(10, 'Testing memory allocation...');
    const allocStart = performance.now();
    const array = new Float64Array(size);
    for (let i = 0; i < size; i++) {
        array[i] = Math.random();
    }
    const allocationTime = performance.now() - allocStart;

    // Sequential read benchmark
    sendProgress(30, 'Testing sequential read...');
    const seqStart = performance.now();
    let seqSum = 0;
    for (let i = 0; i < size; i++) {
        seqSum += array[i];
    }
    const sequentialRead = performance.now() - seqStart;

    // Random read benchmark
    sendProgress(50, 'Testing random read...');
    const randomIndices = new Uint32Array(size);
    for (let i = 0; i < size; i++) {
        randomIndices[i] = Math.floor(Math.random() * size);
    }
    const randStart = performance.now();
    let randSum = 0;
    for (let i = 0; i < size; i++) {
        randSum += array[randomIndices[i]];
    }
    const randomRead = performance.now() - randStart;

    // Copy benchmark
    sendProgress(70, 'Testing memory copy...');
    const copyStart = performance.now();
    const arrayCopy = new Float64Array(array);
    const copyTime = performance.now() - copyStart;

    sendProgress(90, 'Calculating results...');

    const totalTime = performance.now() - startTime;
    const memoryUsed = size * 8 * 2 + size * 4; // Two Float64Arrays + one Uint32Array

    sendProgress(100, 'Benchmark complete');

    self.postMessage({
        type: 'RESULT',
        payload: {
            size,
            totalTime,
            allocationTime,
            sequentialRead,
            randomRead,
            copyTime,
            memoryUsed,
            seqSum,
            randSum
        }
    });
}

function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}
