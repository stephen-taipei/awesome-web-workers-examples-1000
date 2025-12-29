self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class CallStackAnalyzer {
    constructor() { this.stacks = []; }
    captureStack() {
        const err = new Error();
        const stack = err.stack?.split('\n').slice(2).map(line => line.trim()) || [];
        this.stacks.push({ time: performance.now(), stack });
    }
    analyze() {
        const functions = new Map();
        this.stacks.forEach(s => {
            s.stack.forEach(frame => {
                const match = frame.match(/at (\w+)/);
                if (match) functions.set(match[1], (functions.get(match[1]) || 0) + 1);
            });
        });
        return Object.fromEntries([...functions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10));
    }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const analyzer = new CallStackAnalyzer();
    
    function level3() { analyzer.captureStack(); return Math.random(); }
    function level2() { return level3() + level3(); }
    function level1() { return level2() + level2(); }
    
    sendProgress(50, 'Analyzing call stacks...');
    for (let i = 0; i < Math.min(iterations, 100); i++) level1();
    
    sendProgress(100, 'Complete');
    const analysis = analyzer.analyze();
    
    self.postMessage({ type: 'RESULT', payload: {
        'Stacks Captured': analyzer.stacks.length,
        ...Object.fromEntries(Object.entries(analysis).map(([k, v]) => [k + ' count', v]))
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
