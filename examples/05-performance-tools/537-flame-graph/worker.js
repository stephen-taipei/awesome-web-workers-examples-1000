self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class FlameGraphBuilder {
    constructor() { this.stack = []; this.samples = []; }
    push(name) { this.stack.push({ name, start: performance.now() }); }
    pop() {
        const frame = this.stack.pop();
        if (frame) {
            this.samples.push({ name: frame.name, duration: performance.now() - frame.start, depth: this.stack.length, path: [...this.stack.map(f => f.name), frame.name].join(';') });
        }
    }
    getData() { return this.samples; }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const builder = new FlameGraphBuilder();
    
    const profile = (name, fn) => { builder.push(name); const r = fn(); builder.pop(); return r; };
    
    sendProgress(50, 'Building flame graph data...');
    profile('main', () => {
        profile('init', () => { for (let i = 0; i < iterations / 10; i++) Math.random(); });
        profile('process', () => {
            profile('compute', () => { for (let i = 0; i < iterations; i++) Math.sqrt(i); });
            profile('transform', () => { for (let i = 0; i < iterations / 2; i++) Math.sin(i); });
        });
        profile('cleanup', () => { for (let i = 0; i < iterations / 20; i++) {} });
    });
    
    sendProgress(100, 'Complete');
    const data = builder.getData();
    
    self.postMessage({ type: 'RESULT', payload: {
        'Total Frames': data.length,
        'Max Depth': Math.max(...data.map(d => d.depth)),
        'Longest Frame': data.reduce((a, b) => a.duration > b.duration ? a : b).name,
        'Total Duration': data[0]?.duration.toFixed(2) + ' ms'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
