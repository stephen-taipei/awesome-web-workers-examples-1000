self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function throttle(fn, limit) {
    let lastCall = 0;
    return (...args) => {
        const now = performance.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            return fn(...args);
        }
    };
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    
    let normalCalls = 0;
    let throttledCalls = 0;
    
    const normalFn = () => { normalCalls++; };
    const throttledFn = throttle(() => { throttledCalls++; }, 1);
    
    sendProgress(25, 'Normal calls...');
    const normalStart = performance.now();
    for (let i = 0; i < iterations; i++) normalFn();
    const normalTime = performance.now() - normalStart;
    
    sendProgress(60, 'Throttled calls...');
    const throttledStart = performance.now();
    for (let i = 0; i < iterations; i++) throttledFn();
    const throttledTime = performance.now() - throttledStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Normal Calls': normalCalls,
        'Throttled Calls': throttledCalls,
        'Reduction': ((1 - throttledCalls / normalCalls) * 100).toFixed(1) + '%',
        'Time Saved': (normalTime - throttledTime).toFixed(2) + ' ms'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
