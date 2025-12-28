self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const obj = { id: 1, name: 'test', data: [1, 2, 3, 4, 5], nested: { a: 1, b: 2 } };
    
    sendProgress(25, 'Testing JSON stringify/parse...');
    const jsonStart = performance.now();
    for (let i = 0; i < iterations; i++) { JSON.parse(JSON.stringify(obj)); }
    const jsonTime = performance.now() - jsonStart;
    
    sendProgress(50, 'Testing structuredClone...');
    const cloneStart = performance.now();
    for (let i = 0; i < iterations; i++) { structuredClone(obj); }
    const cloneTime = performance.now() - cloneStart;
    
    sendProgress(75, 'Testing manual clone...');
    const manualStart = performance.now();
    for (let i = 0; i < iterations; i++) { Object.assign({}, obj, { nested: { ...obj.nested } }); }
    const manualTime = performance.now() - manualStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: { 'JSON': jsonTime, 'structuredClone': cloneTime, 'Manual': manualTime } });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
