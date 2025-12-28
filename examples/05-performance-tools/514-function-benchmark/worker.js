/**
 * #514 Function Benchmark - Worker Thread
 */
self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.iterations);
};

function regularFunc(x) { return x * 2; }
const arrowFunc = x => x * 2;

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');

    // Regular function call
    sendProgress(15, 'Testing regular function...');
    const regularStart = performance.now();
    let sum = 0;
    for (let i = 0; i < iterations; i++) sum += regularFunc(i);
    const regularTime = performance.now() - regularStart;

    // Arrow function call
    sendProgress(35, 'Testing arrow function...');
    const arrowStart = performance.now();
    sum = 0;
    for (let i = 0; i < iterations; i++) sum += arrowFunc(i);
    const arrowTime = performance.now() - arrowStart;

    // Inline function
    sendProgress(55, 'Testing inline function...');
    const inlineStart = performance.now();
    sum = 0;
    for (let i = 0; i < iterations; i++) sum += (x => x * 2)(i);
    const inlineTime = performance.now() - inlineStart;

    // Method call
    sendProgress(75, 'Testing method call...');
    const obj = { method(x) { return x * 2; } };
    const methodStart = performance.now();
    sum = 0;
    for (let i = 0; i < iterations; i++) sum += obj.method(i);
    const methodTime = performance.now() - methodStart;

    sendProgress(100, 'Complete');

    self.postMessage({
        type: 'RESULT',
        payload: { Regular: regularTime, Arrow: arrowTime, Inline: inlineTime, Method: methodTime }
    });
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
