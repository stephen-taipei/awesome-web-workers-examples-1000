self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
    else if (e.data.type === 'PING') {
        self.postMessage({ type: 'PONG', sendTime: e.data.sendTime, receiveTime: performance.now() });
    }
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    
    const messageSizes = [
        { name: 'Small (100B)', data: new Array(100).fill('x').join('') },
        { name: 'Medium (10KB)', data: new Array(10000).fill('x').join('') },
        { name: 'Large (100KB)', data: new Array(100000).fill('x').join('') }
    ];
    
    const results = {};
    
    messageSizes.forEach((msg, i) => {
        sendProgress(25 * (i + 1), `Testing ${msg.name}...`);
        const start = performance.now();
        for (let j = 0; j < Math.min(iterations, 100); j++) {
            JSON.stringify(msg.data);
            JSON.parse(JSON.stringify(msg.data));
        }
        results[msg.name] = performance.now() - start;
    });
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.toFixed(2) + ' ms'])) });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
