self.onmessage = async function(e) {
    if (e.data.type === 'START') await runBenchmark(e.data.payload.param);
};

function debounce(fn, delay) {
    let timeoutId = null;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

async function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    
    let normalCalls = 0;
    let debouncedExecutions = 0;
    
    sendProgress(25, 'Testing debounce pattern...');
    const debounced = debounce(() => { debouncedExecutions++; }, 10);
    
    // Rapid calls
    for (let i = 0; i < iterations; i++) {
        normalCalls++;
        debounced();
    }
    
    sendProgress(75, 'Waiting for final debounce...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Rapid Calls': normalCalls,
        'Actual Executions': debouncedExecutions,
        'Calls Prevented': normalCalls - debouncedExecutions,
        'Efficiency': ((1 - debouncedExecutions / normalCalls) * 100).toFixed(1) + '%'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
