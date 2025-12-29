self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class TaskTimer {
    constructor() { this.tasks = new Map(); }
    start(name) { this.tasks.set(name, { start: performance.now(), end: null }); }
    end(name) { 
        const task = this.tasks.get(name);
        if (task) task.end = performance.now();
    }
    getDuration(name) {
        const task = this.tasks.get(name);
        return task ? task.end - task.start : 0;
    }
    getAll() {
        const results = {};
        this.tasks.forEach((t, name) => results[name] = t.end - t.start);
        return results;
    }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const timer = new TaskTimer();
    
    timer.start('total');
    
    sendProgress(25, 'Task 1...');
    timer.start('task1');
    for (let i = 0; i < iterations; i++) Math.sqrt(i);
    timer.end('task1');
    
    sendProgress(50, 'Task 2...');
    timer.start('task2');
    const arr = Array.from({ length: iterations }, () => Math.random());
    timer.end('task2');
    
    sendProgress(75, 'Task 3...');
    timer.start('task3');
    arr.sort((a, b) => a - b);
    timer.end('task3');
    
    timer.end('total');
    
    sendProgress(100, 'Complete');
    const times = timer.getAll();
    self.postMessage({ type: 'RESULT', payload: Object.fromEntries(Object.entries(times).map(([k, v]) => [k, v.toFixed(2) + ' ms'])) });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
