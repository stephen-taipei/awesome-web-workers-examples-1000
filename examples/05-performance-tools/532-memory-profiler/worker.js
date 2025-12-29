self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(size) {
    sendProgress(0, 'Starting...');
    const snapshots = [];
    
    const takeSnapshot = (label) => {
        if (performance.memory) {
            snapshots.push({ label, used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize });
        } else {
            snapshots.push({ label, used: 0, total: 0, note: 'memory API not available' });
        }
    };
    
    takeSnapshot('Initial');
    
    sendProgress(25, 'Allocating arrays...');
    const arrays = [];
    for (let i = 0; i < size; i++) arrays.push(new Array(100).fill(i));
    takeSnapshot('After arrays');
    
    sendProgress(50, 'Allocating objects...');
    const objects = [];
    for (let i = 0; i < size; i++) objects.push({ id: i, data: 'test'.repeat(10) });
    takeSnapshot('After objects');
    
    sendProgress(75, 'Clearing references...');
    arrays.length = 0;
    objects.length = 0;
    takeSnapshot('After clear');
    
    sendProgress(100, 'Complete');
    const results = {};
    snapshots.forEach(s => {
        results[s.label] = s.note || `${(s.used / 1024 / 1024).toFixed(2)} MB`;
    });
    self.postMessage({ type: 'RESULT', payload: results });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
