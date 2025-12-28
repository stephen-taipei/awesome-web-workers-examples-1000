self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(size) {
    sendProgress(0, 'Starting...');
    
    sendProgress(20, 'Testing buffer creation...');
    const createStart = performance.now();
    for (let i = 0; i < 1000; i++) { const buf = new ArrayBuffer(size * 10); }
    const createTime = performance.now() - createStart;
    
    sendProgress(40, 'Testing DataView read/write...');
    const buf = new ArrayBuffer(size * 8);
    const view = new DataView(buf);
    const viewStart = performance.now();
    for (let i = 0; i < size; i++) {
        view.setFloat64(i * 8, i * 0.1);
        view.getFloat64(i * 8);
    }
    const viewTime = performance.now() - viewStart;
    
    sendProgress(60, 'Testing TypedArray view...');
    const f64 = new Float64Array(buf);
    const typedStart = performance.now();
    for (let i = 0; i < size; i++) { f64[i] = i * 0.1; const v = f64[i]; }
    const typedTime = performance.now() - typedStart;
    
    sendProgress(80, 'Testing buffer slice...');
    const sliceStart = performance.now();
    for (let i = 0; i < 100; i++) { const slice = buf.slice(0, size * 4); }
    const sliceTime = performance.now() - sliceStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: { 'Creation': createTime, 'DataView': viewTime, 'TypedArray': typedTime, 'Slice': sliceTime } });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
