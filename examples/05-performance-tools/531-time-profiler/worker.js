self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class TimeProfiler {
    constructor() { this.marks = new Map(); this.measures = []; }
    mark(name) { this.marks.set(name, performance.now()); }
    measure(name, startMark, endMark) {
        const start = this.marks.get(startMark);
        const end = this.marks.get(endMark) || performance.now();
        this.measures.push({ name, duration: end - start, start, end });
    }
    getReport() {
        return this.measures.map(m => `${m.name}: ${m.duration.toFixed(3)}ms`).join(', ');
    }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const profiler = new TimeProfiler();
    
    profiler.mark('start');
    sendProgress(25, 'Running task 1...');
    profiler.mark('task1-start');
    let sum = 0;
    for (let i = 0; i < iterations; i++) sum += Math.sqrt(i);
    profiler.mark('task1-end');
    profiler.measure('Task 1', 'task1-start', 'task1-end');
    
    sendProgress(50, 'Running task 2...');
    profiler.mark('task2-start');
    const arr = Array.from({ length: iterations }, (_, i) => i);
    arr.sort((a, b) => b - a);
    profiler.mark('task2-end');
    profiler.measure('Task 2', 'task2-start', 'task2-end');
    
    sendProgress(75, 'Running task 3...');
    profiler.mark('task3-start');
    const str = arr.join(',');
    profiler.mark('task3-end');
    profiler.measure('Task 3', 'task3-start', 'task3-end');
    
    profiler.mark('end');
    profiler.measure('Total', 'start', 'end');
    
    sendProgress(100, 'Complete');
    const results = {};
    profiler.measures.forEach(m => results[m.name] = m.duration);
    self.postMessage({ type: 'RESULT', payload: results });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
