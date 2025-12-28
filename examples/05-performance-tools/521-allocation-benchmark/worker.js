self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    
    sendProgress(20, 'Testing object allocation...');
    const objStart = performance.now();
    for (let i = 0; i < iterations; i++) { const obj = { a: i, b: i * 2 }; }
    const objTime = performance.now() - objStart;
    
    sendProgress(40, 'Testing array allocation...');
    const arrStart = performance.now();
    for (let i = 0; i < iterations; i++) { const arr = new Array(100); }
    const arrTime = performance.now() - arrStart;
    
    sendProgress(60, 'Testing typed array allocation...');
    const typedStart = performance.now();
    for (let i = 0; i < iterations; i++) { const arr = new Float64Array(100); }
    const typedTime = performance.now() - typedStart;
    
    sendProgress(80, 'Testing ArrayBuffer allocation...');
    const bufStart = performance.now();
    for (let i = 0; i < iterations; i++) { const buf = new ArrayBuffer(800); }
    const bufTime = performance.now() - bufStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: { 'Object': objTime, 'Array': arrTime, 'TypedArray': typedTime, 'ArrayBuffer': bufTime } });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
