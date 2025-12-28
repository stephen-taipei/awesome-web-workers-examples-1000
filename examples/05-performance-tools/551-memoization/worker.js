self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function memoize(fn) {
    const cache = new Map();
    return (...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) return cache.get(key);
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
}

function expensiveCalc(n) {
    let result = 0;
    for (let i = 0; i < 1000; i++) result += Math.sin(n + i);
    return result;
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const memoized = memoize(expensiveCalc);
    
    sendProgress(25, 'Without memoization...');
    const noMemoStart = performance.now();
    for (let i = 0; i < iterations; i++) expensiveCalc(i % 100);
    const noMemoTime = performance.now() - noMemoStart;
    
    sendProgress(60, 'With memoization...');
    const memoStart = performance.now();
    for (let i = 0; i < iterations; i++) memoized(i % 100);
    const memoTime = performance.now() - memoStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Without Memo': noMemoTime.toFixed(2) + ' ms',
        'With Memo': memoTime.toFixed(2) + ' ms',
        'Speedup': (noMemoTime / memoTime).toFixed(1) + 'x',
        'Cache Hits': iterations - 100
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
