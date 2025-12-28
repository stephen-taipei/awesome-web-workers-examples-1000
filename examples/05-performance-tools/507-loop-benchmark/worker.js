/**
 * #507 Loop Benchmark - Worker Thread
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    if (type === 'START') runBenchmark(payload.iterations);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Preparing test array...');
    const arr = new Array(iterations).fill(1);

    // For loop
    sendProgress(10, 'Testing for loop...');
    const forStart = performance.now();
    let forSum = 0;
    for (let i = 0; i < iterations; i++) {
        forSum += arr[i];
    }
    const forTime = performance.now() - forStart;

    // While loop
    sendProgress(30, 'Testing while loop...');
    const whileStart = performance.now();
    let whileSum = 0;
    let j = 0;
    while (j < iterations) {
        whileSum += arr[j];
        j++;
    }
    const whileTime = performance.now() - whileStart;

    // forEach
    sendProgress(50, 'Testing forEach...');
    const forEachStart = performance.now();
    let forEachSum = 0;
    arr.forEach(v => { forEachSum += v; });
    const forEachTime = performance.now() - forEachStart;

    // for...of
    sendProgress(70, 'Testing for...of...');
    const forOfStart = performance.now();
    let forOfSum = 0;
    for (const v of arr) {
        forOfSum += v;
    }
    const forOfTime = performance.now() - forOfStart;

    // reduce
    sendProgress(85, 'Testing reduce...');
    const reduceStart = performance.now();
    const reduceSum = arr.reduce((a, b) => a + b, 0);
    const reduceTime = performance.now() - reduceStart;

    const times = { forTime, whileTime, forEachTime, forOfTime, reduceTime };
    const fastest = Object.entries(times).sort((a, b) => a[1] - b[1])[0][0].replace('Time', '');

    sendProgress(100, 'Benchmark complete');

    self.postMessage({
        type: 'RESULT',
        payload: { iterations, forTime, whileTime, forEachTime, forOfTime, reduceTime, fastest }
    });
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
