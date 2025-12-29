self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class Lazy {
    constructor(fn) { this.fn = fn; this.evaluated = false; this.value = null; }
    get() {
        if (!this.evaluated) { this.value = this.fn(); this.evaluated = true; }
        return this.value;
    }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    
    const expensiveFn = () => {
        let sum = 0;
        for (let i = 0; i < 10000; i++) sum += Math.sin(i);
        return sum;
    };
    
    sendProgress(25, 'Eager evaluation...');
    const eagerStart = performance.now();
    const eagerValues = [];
    for (let i = 0; i < iterations; i++) eagerValues.push(expensiveFn());
    const eagerTime = performance.now() - eagerStart;
    
    sendProgress(60, 'Lazy evaluation...');
    const lazyStart = performance.now();
    const lazyValues = [];
    for (let i = 0; i < iterations; i++) lazyValues.push(new Lazy(expensiveFn));
    const lazyCreateTime = performance.now() - lazyStart;
    
    // Access only 10%
    const accessStart = performance.now();
    for (let i = 0; i < iterations / 10; i++) lazyValues[i].get();
    const accessTime = performance.now() - accessStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Eager Time': eagerTime.toFixed(2) + ' ms',
        'Lazy Create': lazyCreateTime.toFixed(2) + ' ms',
        'Lazy Access (10%)': accessTime.toFixed(2) + ' ms',
        'Savings': ((1 - (lazyCreateTime + accessTime) / eagerTime) * 100).toFixed(1) + '%'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
