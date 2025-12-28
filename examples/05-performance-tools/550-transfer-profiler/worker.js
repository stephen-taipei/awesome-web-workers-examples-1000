self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
    else if (e.data.buffer) {
        self.postMessage({ type: 'RECEIVED', size: e.data.buffer.byteLength });
    }
};

function runBenchmark(sizeMB) {
    sendProgress(0, 'Starting...');
    const size = sizeMB * 1024 * 1024;
    
    sendProgress(25, 'Creating buffer...');
    const buffer = new ArrayBuffer(size);
    new Uint8Array(buffer).fill(42);
    
    sendProgress(50, 'Testing structured clone overhead...');
    const cloneStart = performance.now();
    const clonedBuffer = buffer.slice(0);
    const cloneTime = performance.now() - cloneStart;
    
    sendProgress(75, 'Testing view creation...');
    const viewStart = performance.now();
    const view = new Uint8Array(buffer);
    let sum = 0;
    for (let i = 0; i < 1000; i++) sum += view[i];
    const viewTime = performance.now() - viewStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Buffer Size': sizeMB + ' MB',
        'Clone Time': cloneTime.toFixed(2) + ' ms',
        'Clone Speed': (sizeMB / (cloneTime / 1000)).toFixed(0) + ' MB/s',
        'View Access': viewTime.toFixed(4) + ' ms'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
