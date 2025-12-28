self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class CallCounter {
    constructor() { this.counts = new Map(); this.times = new Map(); }
    wrap(name, fn) {
        return (...args) => {
            this.counts.set(name, (this.counts.get(name) || 0) + 1);
            const start = performance.now();
            const result = fn(...args);
            this.times.set(name, (this.times.get(name) || 0) + (performance.now() - start));
            return result;
        };
    }
    getStats() {
        const stats = {};
        this.counts.forEach((count, name) => {
            stats[name] = { calls: count, totalTime: this.times.get(name), avgTime: this.times.get(name) / count };
        });
        return stats;
    }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const counter = new CallCounter();
    
    const add = counter.wrap('add', (a, b) => a + b);
    const multiply = counter.wrap('multiply', (a, b) => a * b);
    const sqrt = counter.wrap('sqrt', (x) => Math.sqrt(x));
    
    sendProgress(50, 'Executing functions...');
    let result = 0;
    for (let i = 0; i < iterations; i++) {
        result = add(result, i);
        if (i % 2 === 0) result = multiply(result, 0.999);
        if (i % 3 === 0) result = sqrt(Math.abs(result));
    }
    
    sendProgress(100, 'Complete');
    const stats = counter.getStats();
    const results = {};
    Object.entries(stats).forEach(([name, s]) => {
        results[`${name} calls`] = s.calls;
        results[`${name} avg`] = s.avgTime.toFixed(4) + ' ms';
    });
    self.postMessage({ type: 'RESULT', payload: results });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
