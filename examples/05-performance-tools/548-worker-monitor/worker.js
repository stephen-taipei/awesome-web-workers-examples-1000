self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const metrics = { messages: 0, startTime: performance.now(), tasks: 0 };
    
    sendProgress(25, 'Processing tasks...');
    for (let i = 0; i < iterations; i++) {
        Math.sqrt(i);
        metrics.tasks++;
    }
    
    sendProgress(50, 'Simulating message processing...');
    for (let i = 0; i < iterations / 10; i++) {
        metrics.messages++;
    }
    
    sendProgress(100, 'Complete');
    const duration = performance.now() - metrics.startTime;
    
    self.postMessage({ type: 'RESULT', payload: {
        'Tasks Processed': metrics.tasks,
        'Messages Handled': metrics.messages,
        'Uptime': duration.toFixed(2) + ' ms',
        'Tasks/sec': Math.round(metrics.tasks / (duration / 1000))
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
