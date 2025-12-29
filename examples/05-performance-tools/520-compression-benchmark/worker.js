self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(size) {
    sendProgress(0, 'Generating data...');
    const data = new Uint8Array(size * 100);
    for (let i = 0; i < data.length; i++) data[i] = Math.floor(Math.random() * 256);
    
    sendProgress(25, 'Testing RLE compression...');
    const rleStart = performance.now();
    const rleCompressed = rleEncode(data);
    const rleTime = performance.now() - rleStart;
    
    sendProgress(50, 'Testing simple delta...');
    const deltaStart = performance.now();
    const deltaCompressed = deltaEncode(data);
    const deltaTime = performance.now() - deltaStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: { 'RLE Time': rleTime, 'Delta Time': deltaTime, 'Original Size': data.length + ' bytes', 'RLE Ratio': (rleCompressed.length / data.length * 100).toFixed(1) + '%' } });
}

function rleEncode(data) {
    const result = [];
    let count = 1;
    for (let i = 1; i <= data.length; i++) {
        if (i < data.length && data[i] === data[i-1] && count < 255) count++;
        else { result.push(count, data[i-1]); count = 1; }
    }
    return new Uint8Array(result);
}

function deltaEncode(data) {
    const result = new Int16Array(data.length);
    result[0] = data[0];
    for (let i = 1; i < data.length; i++) result[i] = data[i] - data[i-1];
    return result;
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
