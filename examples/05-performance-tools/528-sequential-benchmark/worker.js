self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    
    sendProgress(30, 'Sequential operations...');
    const seqStart = performance.now();
    let result = 0;
    for (let i = 0; i < iterations; i++) {
        result += Math.sqrt(i);
        result += Math.sin(result);
        result += Math.log(Math.abs(result) + 1);
    }
    const seqTime = performance.now() - seqStart;
    
    sendProgress(60, 'Batched operations...');
    const batchStart = performance.now();
    const sqrts = new Float64Array(iterations);
    for (let i = 0; i < iterations; i++) sqrts[i] = Math.sqrt(i);
    const sins = new Float64Array(iterations);
    for (let i = 0; i < iterations; i++) sins[i] = Math.sin(sqrts[i]);
    result = 0;
    for (let i = 0; i < iterations; i++) result += sins[i];
    const batchTime = performance.now() - batchStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: { 'Sequential': seqTime, 'Batched': batchTime, 'Comparison': seqTime < batchTime ? 'Sequential faster' : 'Batched faster' } });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
