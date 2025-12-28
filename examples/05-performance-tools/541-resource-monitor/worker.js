self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const samples = [];
    
    const sample = () => ({
        time: performance.now(),
        memory: performance.memory?.usedJSHeapSize || 0
    });
    
    samples.push(sample());
    
    sendProgress(25, 'Phase 1: Allocation...');
    const data = [];
    for (let i = 0; i < iterations; i++) data.push(new Array(100).fill(i));
    samples.push(sample());
    
    sendProgress(50, 'Phase 2: Processing...');
    data.forEach(arr => arr.reduce((a, b) => a + b, 0));
    samples.push(sample());
    
    sendProgress(75, 'Phase 3: Cleanup...');
    data.length = 0;
    samples.push(sample());
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Samples': samples.length,
        'Peak Memory': Math.max(...samples.map(s => s.memory)) / 1024 / 1024 + ' MB',
        'Duration': (samples[samples.length-1].time - samples[0].time).toFixed(2) + ' ms'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
