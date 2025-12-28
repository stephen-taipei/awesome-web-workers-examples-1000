/**
 * #515 Promise Benchmark - Worker Thread
 */
self.onmessage = async function(e) {
    if (e.data.type === 'START') await runBenchmark(e.data.payload.param);
};

async function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');

    // Promise.resolve benchmark
    sendProgress(15, 'Testing Promise.resolve...');
    const resolveStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        await Promise.resolve(i);
    }
    const resolveTime = performance.now() - resolveStart;

    // Promise chain benchmark
    sendProgress(35, 'Testing Promise chain...');
    const chainStart = performance.now();
    for (let i = 0; i < iterations / 10; i++) {
        await Promise.resolve(i).then(x => x + 1).then(x => x + 1).then(x => x + 1);
    }
    const chainTime = performance.now() - chainStart;

    // Promise.all benchmark
    sendProgress(55, 'Testing Promise.all...');
    const allStart = performance.now();
    for (let i = 0; i < iterations / 100; i++) {
        await Promise.all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
    }
    const allTime = performance.now() - allStart;

    // Async/await benchmark
    sendProgress(75, 'Testing async/await...');
    const asyncFn = async (x) => x * 2;
    const asyncStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        await asyncFn(i);
    }
    const asyncTime = performance.now() - asyncStart;

    sendProgress(100, 'Complete');

    self.postMessage({
        type: 'RESULT',
        payload: { 'Promise.resolve': resolveTime, 'Promise Chain': chainTime, 'Promise.all': allTime, 'Async/Await': asyncTime }
    });
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
