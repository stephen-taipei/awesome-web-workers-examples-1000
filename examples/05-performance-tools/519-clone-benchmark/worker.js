self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const arr = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: Math.random() }));
    
    sendProgress(25, 'Testing spread operator...');
    const spreadStart = performance.now();
    for (let i = 0; i < iterations; i++) { const copy = [...arr]; }
    const spreadTime = performance.now() - spreadStart;
    
    sendProgress(50, 'Testing Array.from...');
    const fromStart = performance.now();
    for (let i = 0; i < iterations; i++) { const copy = Array.from(arr); }
    const fromTime = performance.now() - fromStart;
    
    sendProgress(75, 'Testing slice...');
    const sliceStart = performance.now();
    for (let i = 0; i < iterations; i++) { const copy = arr.slice(); }
    const sliceTime = performance.now() - sliceStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: { 'Spread': spreadTime, 'Array.from': fromTime, 'Slice': sliceTime } });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
