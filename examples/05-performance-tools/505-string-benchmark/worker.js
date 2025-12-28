/**
 * #505 String Benchmark - Worker Thread
 * Performs string operations benchmarks
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'START') {
        runBenchmark(payload.iterations);
    }
};

function runBenchmark(iterations) {
    const startTime = performance.now();

    sendProgress(0, 'Starting string benchmark...');

    // Concatenation benchmark
    sendProgress(10, 'Testing string concatenation...');
    const concatStart = performance.now();
    let concatResult = '';
    for (let i = 0; i < iterations / 100; i++) {
        concatResult += 'test' + i;
    }
    const concatTime = performance.now() - concatStart;

    // Split benchmark
    sendProgress(30, 'Testing string split...');
    const testString = 'a,b,c,d,e,f,g,h,i,j'.repeat(100);
    const splitStart = performance.now();
    for (let i = 0; i < iterations / 10; i++) {
        testString.split(',');
    }
    const splitTime = performance.now() - splitStart;

    // Replace benchmark
    sendProgress(50, 'Testing string replace...');
    const replaceStr = 'hello world hello world hello world';
    const replaceStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        replaceStr.replace(/hello/g, 'hi');
    }
    const replaceTime = performance.now() - replaceStart;

    // Search benchmark
    sendProgress(70, 'Testing string search...');
    const searchStr = 'The quick brown fox jumps over the lazy dog'.repeat(10);
    const searchStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        searchStr.indexOf('fox');
        searchStr.includes('lazy');
    }
    const searchTime = performance.now() - searchStart;

    // Template literal benchmark
    sendProgress(85, 'Testing template literals...');
    const templateStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const result = `Value: ${i}, Square: ${i * i}, Cube: ${i * i * i}`;
    }
    const templateTime = performance.now() - templateStart;

    const totalTime = performance.now() - startTime;

    sendProgress(100, 'Benchmark complete');

    self.postMessage({
        type: 'RESULT',
        payload: {
            iterations,
            totalTime,
            concatTime,
            splitTime,
            replaceTime,
            searchTime,
            templateTime
        }
    });
}

function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}
