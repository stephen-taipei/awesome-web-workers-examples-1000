self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    
    sendProgress(20, 'Testing bitwise AND/OR...');
    const andOrStart = performance.now();
    let result = 0;
    for (let i = 0; i < iterations; i++) { result = (i & 0xFF) | (i >> 8); }
    const andOrTime = performance.now() - andOrStart;
    
    sendProgress(40, 'Testing bit shifts...');
    const shiftStart = performance.now();
    for (let i = 0; i < iterations; i++) { result = (i << 2) >>> 1; }
    const shiftTime = performance.now() - shiftStart;
    
    sendProgress(60, 'Testing XOR...');
    const xorStart = performance.now();
    for (let i = 0; i < iterations; i++) { result ^= i; }
    const xorTime = performance.now() - xorStart;
    
    sendProgress(80, 'Testing bit counting...');
    const countStart = performance.now();
    for (let i = 0; i < iterations; i++) { result = popCount(i); }
    const countTime = performance.now() - countStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: { 'AND/OR': andOrTime, 'Shifts': shiftTime, 'XOR': xorTime, 'Popcount': countTime } });
}

function popCount(n) {
    n = n - ((n >> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
    return (((n + (n >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
