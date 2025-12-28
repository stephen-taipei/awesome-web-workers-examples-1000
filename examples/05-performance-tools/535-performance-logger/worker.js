self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class PerformanceLogger {
    constructor() { this.logs = []; }
    log(category, message, data = {}) {
        this.logs.push({ time: performance.now(), category, message, data });
    }
    getLogs() { return this.logs; }
    getByCategory(cat) { return this.logs.filter(l => l.category === cat); }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const logger = new PerformanceLogger();
    
    logger.log('system', 'Benchmark started', { iterations });
    
    sendProgress(25, 'Phase 1...');
    logger.log('phase', 'Phase 1 start');
    let sum = 0;
    for (let i = 0; i < iterations; i++) sum += i;
    logger.log('phase', 'Phase 1 end', { sum });
    
    sendProgress(50, 'Phase 2...');
    logger.log('phase', 'Phase 2 start');
    const arr = [];
    for (let i = 0; i < iterations / 10; i++) arr.push(Math.random());
    logger.log('phase', 'Phase 2 end', { arraySize: arr.length });
    
    sendProgress(75, 'Phase 3...');
    logger.log('phase', 'Phase 3 start');
    arr.sort((a, b) => a - b);
    logger.log('phase', 'Phase 3 end');
    
    logger.log('system', 'Benchmark complete');
    
    sendProgress(100, 'Complete');
    const logs = logger.getLogs();
    self.postMessage({ type: 'RESULT', payload: {
        'Total Logs': logs.length,
        'System Logs': logger.getByCategory('system').length,
        'Phase Logs': logger.getByCategory('phase').length,
        'Duration': (logs[logs.length-1].time - logs[0].time).toFixed(2) + ' ms'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
