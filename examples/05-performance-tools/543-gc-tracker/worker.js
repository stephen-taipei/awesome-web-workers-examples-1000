self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const gcHints = [];
    let lastHeap = performance.memory?.usedJSHeapSize || 0;
    
    sendProgress(25, 'Creating garbage...');
    for (let i = 0; i < iterations; i++) {
        const temp = new Array(1000).fill(i);
        const currentHeap = performance.memory?.usedJSHeapSize || 0;
        if (currentHeap < lastHeap - 1000000) {
            gcHints.push({ iteration: i, dropped: (lastHeap - currentHeap) / 1024 / 1024 });
        }
        lastHeap = currentHeap;
    }
    
    sendProgress(75, 'Analyzing...');
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Iterations': iterations,
        'GC Events Detected': gcHints.length,
        'Total Reclaimed': gcHints.reduce((a, b) => a + b.dropped, 0).toFixed(2) + ' MB',
        'Note': performance.memory ? 'Real data' : 'Simulated (no memory API)'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
