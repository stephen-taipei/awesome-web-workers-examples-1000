self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const delays = [];
    let count = 0;
    const targetIterations = Math.min(iterations, 100);
    
    return new Promise(resolve => {
        const measure = (expected) => {
            const actual = performance.now();
            if (count > 0) delays.push(actual - expected);
            count++;
            
            sendProgress(Math.floor(count / targetIterations * 100), `Measuring... ${count}/${targetIterations}`);
            
            if (count < targetIterations) {
                const next = performance.now();
                setTimeout(() => measure(next), 0);
            } else {
                const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
                const max = Math.max(...delays);
                const sorted = [...delays].sort((a, b) => a - b);
                
                self.postMessage({ type: 'RESULT', payload: {
                    'Samples': delays.length,
                    'Avg Delay': avg.toFixed(4) + ' ms',
                    'Max Delay': max.toFixed(4) + ' ms',
                    'P95 Delay': sorted[Math.floor(delays.length * 0.95)]?.toFixed(4) + ' ms'
                }});
                resolve();
            }
        };
        measure(performance.now());
    });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
