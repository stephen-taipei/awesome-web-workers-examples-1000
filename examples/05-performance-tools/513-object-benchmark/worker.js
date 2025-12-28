/**
 * #513 Object Benchmark - Worker Thread
 */
self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.iterations);
};

function runBenchmark(iterations) {
    const startTime = performance.now();
    sendProgress(0, 'Starting...');

    // Object creation
    sendProgress(15, 'Testing object creation...');
    const createStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const obj = { a: i, b: i * 2, c: 'test' };
    }
    const createTime = performance.now() - createStart;

    // Property access
    sendProgress(35, 'Testing property access...');
    const obj = { a: 1, b: 2, c: 3, d: 4, e: 5 };
    const accessStart = performance.now();
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
        sum += obj.a + obj.b + obj.c + obj.d + obj.e;
    }
    const accessTime = performance.now() - accessStart;

    // Object.keys
    sendProgress(55, 'Testing Object.keys...');
    const keysStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        Object.keys(obj);
    }
    const keysTime = performance.now() - keysStart;

    // Object spread
    sendProgress(75, 'Testing object spread...');
    const spreadStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const newObj = { ...obj, f: i };
    }
    const spreadTime = performance.now() - spreadStart;

    const totalTime = performance.now() - startTime;
    sendProgress(100, 'Complete');

    self.postMessage({
        type: 'RESULT',
        payload: { Create: createTime, Access: accessTime, Keys: keysTime, Spread: spreadTime, Total: totalTime }
    });
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
