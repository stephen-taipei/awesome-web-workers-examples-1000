self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class ExecutionTracer {
    constructor() { this.trace = []; this.depth = 0; }
    enter(name) {
        this.trace.push({ type: 'enter', name, depth: this.depth++, time: performance.now() });
    }
    exit(name) {
        this.trace.push({ type: 'exit', name, depth: --this.depth, time: performance.now() });
    }
    getTrace() { return this.trace; }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const tracer = new ExecutionTracer();
    
    const tracedFunc = (name, fn) => {
        return (...args) => { tracer.enter(name); const r = fn(...args); tracer.exit(name); return r; };
    };
    
    const outer = tracedFunc('outer', (n) => {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += inner(i);
        return sum;
    });
    
    const inner = tracedFunc('inner', (x) => Math.sqrt(x));
    
    sendProgress(50, 'Tracing execution...');
    outer(Math.min(iterations, 100));
    
    sendProgress(100, 'Complete');
    const trace = tracer.getTrace();
    const enterCount = trace.filter(t => t.type === 'enter').length;
    const maxDepth = Math.max(...trace.map(t => t.depth));
    
    self.postMessage({ type: 'RESULT', payload: {
        'Total Events': trace.length,
        'Function Calls': enterCount,
        'Max Depth': maxDepth,
        'Trace Duration': (trace[trace.length-1].time - trace[0].time).toFixed(2) + ' ms'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
