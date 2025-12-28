self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(size) {
    sendProgress(0, 'Starting...');
    const data = Array.from({ length: size }, () => Math.random());
    
    sendProgress(30, 'Single pass processing...');
    const singleStart = performance.now();
    let sum = 0, max = -Infinity, min = Infinity;
    for (const v of data) { sum += v; if (v > max) max = v; if (v < min) min = v; }
    const singleTime = performance.now() - singleStart;
    
    sendProgress(60, 'Multiple pass processing...');
    const multiStart = performance.now();
    sum = data.reduce((a, b) => a + b, 0);
    max = Math.max(...data.slice(0, 10000));
    min = Math.min(...data.slice(0, 10000));
    const multiTime = performance.now() - multiStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: { 'Single Pass': singleTime, 'Multiple Pass': multiTime, 'Speedup': (multiTime / singleTime).toFixed(2) + 'x slower' } });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
