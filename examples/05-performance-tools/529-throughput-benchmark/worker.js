self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(size) {
    sendProgress(0, 'Starting...');
    
    sendProgress(25, 'Testing read throughput...');
    const data = new Uint8Array(size * 1024);
    for (let i = 0; i < data.length; i++) data[i] = i & 255;
    
    const readStart = performance.now();
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const readTime = performance.now() - readStart;
    const readMBps = (size / 1024) / (readTime / 1000);
    
    sendProgress(50, 'Testing write throughput...');
    const writeStart = performance.now();
    for (let i = 0; i < data.length; i++) data[i] = (i * 2) & 255;
    const writeTime = performance.now() - writeStart;
    const writeMBps = (size / 1024) / (writeTime / 1000);
    
    sendProgress(75, 'Testing copy throughput...');
    const dest = new Uint8Array(size * 1024);
    const copyStart = performance.now();
    dest.set(data);
    const copyTime = performance.now() - copyStart;
    const copyMBps = (size / 1024) / (copyTime / 1000);
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: { 
        'Read': readTime, 'Write': writeTime, 'Copy': copyTime,
        'Read Speed': readMBps.toFixed(0) + ' MB/s',
        'Write Speed': writeMBps.toFixed(0) + ' MB/s',
        'Copy Speed': copyMBps.toFixed(0) + ' MB/s'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
