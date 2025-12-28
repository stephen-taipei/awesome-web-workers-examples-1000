self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(size) {
    sendProgress(0, 'Starting...');
    
    sendProgress(20, 'Testing Uint8Array...');
    const u8 = new Uint8Array(size);
    const u8Start = performance.now();
    for (let i = 0; i < size; i++) u8[i] = i & 255;
    let sum = 0; for (let i = 0; i < size; i++) sum += u8[i];
    const u8Time = performance.now() - u8Start;
    
    sendProgress(40, 'Testing Int32Array...');
    const i32 = new Int32Array(size);
    const i32Start = performance.now();
    for (let i = 0; i < size; i++) i32[i] = i;
    sum = 0; for (let i = 0; i < size; i++) sum += i32[i];
    const i32Time = performance.now() - i32Start;
    
    sendProgress(60, 'Testing Float64Array...');
    const f64 = new Float64Array(size);
    const f64Start = performance.now();
    for (let i = 0; i < size; i++) f64[i] = i * 0.1;
    sum = 0; for (let i = 0; i < size; i++) sum += f64[i];
    const f64Time = performance.now() - f64Start;
    
    sendProgress(80, 'Testing regular Array...');
    const arr = new Array(size);
    const arrStart = performance.now();
    for (let i = 0; i < size; i++) arr[i] = i;
    sum = 0; for (let i = 0; i < size; i++) sum += arr[i];
    const arrTime = performance.now() - arrStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: { 'Uint8Array': u8Time, 'Int32Array': i32Time, 'Float64Array': f64Time, 'Regular Array': arrTime } });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
