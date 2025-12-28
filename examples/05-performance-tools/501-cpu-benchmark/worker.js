/**
 * #501 CPU Benchmark - Worker Thread
 * Performs CPU-intensive benchmark tests
 */

let shouldStop = false;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            shouldStop = false;
            runBenchmark(payload.iterations);
            break;
        case 'STOP':
            shouldStop = true;
            break;
    }
};

function runBenchmark(iterations) {
    const startTime = performance.now();

    sendProgress(0, 'Starting CPU benchmark...');

    // Integer operations benchmark
    sendProgress(10, 'Testing integer operations...');
    const intStart = performance.now();
    let intResult = 0;
    for (let i = 0; i < iterations && !shouldStop; i++) {
        intResult += i * 3 - i / 2 + i % 7;
        intResult = intResult ^ (i << 2);
    }
    const intOps = performance.now() - intStart;

    if (shouldStop) return;

    // Floating-point operations benchmark
    sendProgress(40, 'Testing floating-point operations...');
    const floatStart = performance.now();
    let floatResult = 0.0;
    for (let i = 0; i < iterations && !shouldStop; i++) {
        floatResult += Math.sin(i * 0.001) * Math.cos(i * 0.002);
        floatResult *= Math.sqrt(Math.abs(floatResult) + 1);
    }
    const floatOps = performance.now() - floatStart;

    if (shouldStop) return;

    // Branch prediction benchmark
    sendProgress(70, 'Testing branch operations...');
    const branchStart = performance.now();
    let branchResult = 0;
    for (let i = 0; i < iterations && !shouldStop; i++) {
        if (i % 2 === 0) branchResult++;
        else if (i % 3 === 0) branchResult += 2;
        else if (i % 5 === 0) branchResult += 3;
        else branchResult--;
    }
    const branchOps = performance.now() - branchStart;

    if (shouldStop) return;

    const totalTime = performance.now() - startTime;

    sendProgress(100, 'Benchmark complete');

    self.postMessage({
        type: 'RESULT',
        payload: {
            iterations,
            totalTime,
            intOps,
            floatOps,
            branchOps,
            intResult,
            floatResult,
            branchResult
        }
    });
}

function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}
