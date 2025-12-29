/**
 * #506 Math Benchmark - Worker Thread
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    if (type === 'START') runBenchmark(payload.iterations);
};

function runBenchmark(iterations) {
    const startTime = performance.now();
    sendProgress(0, 'Starting math benchmark...');

    // Trigonometry benchmark
    sendProgress(10, 'Testing trigonometry...');
    const trigStart = performance.now();
    let trigResult = 0;
    for (let i = 0; i < iterations; i++) {
        trigResult += Math.sin(i * 0.001) + Math.cos(i * 0.001) + Math.tan(i * 0.0001);
    }
    const trigTime = performance.now() - trigStart;

    // Logarithm benchmark
    sendProgress(35, 'Testing logarithms...');
    const logStart = performance.now();
    let logResult = 0;
    for (let i = 1; i <= iterations; i++) {
        logResult += Math.log(i) + Math.log10(i) + Math.log2(i);
    }
    const logTime = performance.now() - logStart;

    // Power/sqrt benchmark
    sendProgress(60, 'Testing power/sqrt...');
    const powStart = performance.now();
    let powResult = 0;
    for (let i = 0; i < iterations; i++) {
        powResult += Math.pow(i, 0.5) + Math.sqrt(i) + Math.cbrt(i);
    }
    const powTime = performance.now() - powStart;

    // Random benchmark
    sendProgress(85, 'Testing random...');
    const randomStart = performance.now();
    let randomResult = 0;
    for (let i = 0; i < iterations; i++) {
        randomResult += Math.random();
    }
    const randomTime = performance.now() - randomStart;

    const totalTime = performance.now() - startTime;
    sendProgress(100, 'Benchmark complete');

    self.postMessage({
        type: 'RESULT',
        payload: { iterations, totalTime, trigTime, logTime, powTime, randomTime }
    });
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
