self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    
    sendProgress(25, 'Creating short-lived objects...');
    const shortStart = performance.now();
    for (let i = 0; i < iterations; i++) { const obj = { data: new Array(100).fill(i) }; }
    const shortTime = performance.now() - shortStart;
    
    sendProgress(50, 'Creating with object pool...');
    const pool = [];
    const poolStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const obj = pool.pop() || { data: [] };
        obj.data.length = 100;
        obj.data.fill(i);
        pool.push(obj);
    }
    const poolTime = performance.now() - poolStart;
    
    sendProgress(75, 'Creating large objects...');
    const largeStart = performance.now();
    for (let i = 0; i < iterations / 100; i++) { const obj = { data: new Array(10000).fill(i) }; }
    const largeTime = performance.now() - largeStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: { 'Short-lived': shortTime, 'Pooled': poolTime, 'Large Objects': largeTime, 'Pool Benefit': ((1 - poolTime/shortTime) * 100).toFixed(1) + '%' } });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
