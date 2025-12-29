self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
    else if (e.data.type === 'PING') self.postMessage({ type: 'PONG', time: e.data.time });
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    
    sendProgress(25, 'Testing function call latency...');
    const times = [];
    const noop = () => {};
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        noop();
        times.push(performance.now() - start);
    }
    const funcLatency = times.reduce((a, b) => a + b, 0) / times.length;
    
    sendProgress(50, 'Testing array access latency...');
    const arr = new Array(1000).fill(0);
    const accessTimes = [];
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const v = arr[i % 1000];
        accessTimes.push(performance.now() - start);
    }
    const accessLatency = accessTimes.reduce((a, b) => a + b, 0) / accessTimes.length;
    
    sendProgress(75, 'Testing Map lookup latency...');
    const map = new Map(Array.from({ length: 1000 }, (_, i) => ['key' + i, i]));
    const mapTimes = [];
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        map.get('key' + (i % 1000));
        mapTimes.push(performance.now() - start);
    }
    const mapLatency = mapTimes.reduce((a, b) => a + b, 0) / mapTimes.length;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Function Call': (funcLatency * 1000).toFixed(4) + ' us',
        'Array Access': (accessLatency * 1000).toFixed(4) + ' us',
        'Map Lookup': (mapLatency * 1000).toFixed(4) + ' us',
        'Iterations': iterations
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
