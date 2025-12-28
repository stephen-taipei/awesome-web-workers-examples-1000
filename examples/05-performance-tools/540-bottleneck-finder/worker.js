self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const timings = {};
    
    sendProgress(15, 'Testing CPU-bound...');
    const cpuStart = performance.now();
    let sum = 0;
    for (let i = 0; i < iterations; i++) sum += Math.sqrt(i);
    timings['CPU-bound'] = performance.now() - cpuStart;
    
    sendProgress(30, 'Testing Memory-bound...');
    const memStart = performance.now();
    const arr = new Array(iterations);
    for (let i = 0; i < iterations; i++) arr[i] = { id: i, value: Math.random() };
    timings['Memory-bound'] = performance.now() - memStart;
    
    sendProgress(50, 'Testing String-bound...');
    const strStart = performance.now();
    let str = '';
    for (let i = 0; i < iterations / 100; i++) str += 'test';
    timings['String-bound'] = performance.now() - strStart;
    
    sendProgress(70, 'Testing Array-bound...');
    const arrStart = performance.now();
    const sorted = [...arr].sort((a, b) => a.value - b.value);
    timings['Array-bound'] = performance.now() - arrStart;
    
    sendProgress(100, 'Complete');
    const bottleneck = Object.entries(timings).sort((a, b) => b[1] - a[1])[0];
    
    self.postMessage({ type: 'RESULT', payload: {
        ...Object.fromEntries(Object.entries(timings).map(([k, v]) => [k, v.toFixed(2) + ' ms'])),
        'Bottleneck': bottleneck[0]
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
