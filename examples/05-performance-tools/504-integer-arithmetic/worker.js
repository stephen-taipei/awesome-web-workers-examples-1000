self.onmessage = function(e) {
    const { iterations } = e.data;
    const results = [];
    let startTime, endTime;

    // Test 1: Addition
    // We try to prevent optimization by using a checksum variable
    let sum = 0;
    startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
        sum += i;
    }
    endTime = performance.now();
    results.push(formatResult('Addition', iterations, endTime - startTime));
    self.postMessage({ type: 'progress', percent: 25 });

    // Test 2: Multiplication
    let prod = 1;
    startTime = performance.now();
    for (let i = 1; i <= iterations; i++) {
        prod *= (i % 10 + 1); // Avoid overflow to Infinity quickly
    }
    endTime = performance.now();
    results.push(formatResult('Multiplication', iterations, endTime - startTime));
    self.postMessage({ type: 'progress', percent: 50 });

    // Test 3: Division
    let div = 1000000;
    startTime = performance.now();
    for (let i = 1; i <= iterations; i++) {
        div /= (i % 10 + 1);
        if (div < 1) div = 1000000; // Reset to avoid underflow
    }
    endTime = performance.now();
    results.push(formatResult('Division', iterations, endTime - startTime));
    self.postMessage({ type: 'progress', percent: 75 });

    // Test 4: Modulo
    let mod = 0;
    startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
        mod = i % 100;
    }
    endTime = performance.now();
    results.push(formatResult('Modulo', iterations, endTime - startTime));

    // Total aggregate time calculation for score
    const totalTime = results.reduce((acc, r) => acc + r.time, 0);

    self.postMessage({ type: 'complete', results, totalTime });
};

function formatResult(name, ops, time) {
    return {
        name,
        ops,
        time,
        opsPerSec: Math.floor(ops / (time / 1000))
    };
}
