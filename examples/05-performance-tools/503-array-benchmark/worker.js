/**
 * #503 Array Benchmark - Worker Thread
 * Performs array operations benchmarks
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'START') {
        runBenchmark(payload.size);
    }
};

function runBenchmark(size) {
    const startTime = performance.now();

    sendProgress(0, 'Starting array benchmark...');

    // Push benchmark
    sendProgress(10, 'Testing push operations...');
    const pushStart = performance.now();
    const arr = [];
    for (let i = 0; i < size; i++) {
        arr.push(Math.random());
    }
    const pushTime = performance.now() - pushStart;

    // Map benchmark
    sendProgress(25, 'Testing map operation...');
    const mapStart = performance.now();
    const mapped = arr.map(x => x * 2);
    const mapTime = performance.now() - mapStart;

    // Filter benchmark
    sendProgress(45, 'Testing filter operation...');
    const filterStart = performance.now();
    const filtered = arr.filter(x => x > 0.5);
    const filterTime = performance.now() - filterStart;

    // Reduce benchmark
    sendProgress(65, 'Testing reduce operation...');
    const reduceStart = performance.now();
    const sum = arr.reduce((a, b) => a + b, 0);
    const reduceTime = performance.now() - reduceStart;

    // Sort benchmark
    sendProgress(80, 'Testing sort operation...');
    const sortArr = [...arr];
    const sortStart = performance.now();
    sortArr.sort((a, b) => a - b);
    const sortTime = performance.now() - sortStart;

    const totalTime = performance.now() - startTime;

    sendProgress(100, 'Benchmark complete');

    self.postMessage({
        type: 'RESULT',
        payload: {
            size,
            totalTime,
            pushTime,
            mapTime,
            filterTime,
            reduceTime,
            sortTime
        }
    });
}

function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}
