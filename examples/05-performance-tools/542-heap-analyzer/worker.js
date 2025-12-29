self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(size) {
    sendProgress(0, 'Starting...');
    const allocations = [];
    
    sendProgress(25, 'Creating objects...');
    for (let i = 0; i < size; i++) {
        allocations.push({ type: 'object', size: 100, data: new Array(100).fill(i) });
    }
    
    sendProgress(50, 'Creating strings...');
    for (let i = 0; i < size / 10; i++) {
        allocations.push({ type: 'string', size: 1000, data: 'x'.repeat(1000) });
    }
    
    sendProgress(75, 'Analyzing...');
    const byType = {};
    allocations.forEach(a => {
        if (!byType[a.type]) byType[a.type] = { count: 0, totalSize: 0 };
        byType[a.type].count++;
        byType[a.type].totalSize += a.size;
    });
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Total Allocations': allocations.length,
        'Objects': byType.object?.count || 0,
        'Strings': byType.string?.count || 0,
        'Est. Memory': ((byType.object?.totalSize || 0) + (byType.string?.totalSize || 0)) / 1024 + ' KB'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
