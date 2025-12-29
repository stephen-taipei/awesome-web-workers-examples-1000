self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class ObjectPool {
    constructor(factory, reset, size) {
        this.factory = factory;
        this.reset = reset;
        this.pool = Array.from({ length: size }, factory);
    }
    get() { return this.pool.pop() || this.factory(); }
    release(obj) { this.reset(obj); this.pool.push(obj); }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    
    const factory = () => ({ x: 0, y: 0, vx: 0, vy: 0, active: false });
    const reset = (obj) => { obj.x = obj.y = obj.vx = obj.vy = 0; obj.active = false; };
    
    sendProgress(25, 'Without pool...');
    const noPoolStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const obj = factory();
        obj.x = i; obj.y = i * 2; obj.active = true;
    }
    const noPoolTime = performance.now() - noPoolStart;
    
    sendProgress(60, 'With pool...');
    const pool = new ObjectPool(factory, reset, 100);
    const poolStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const obj = pool.get();
        obj.x = i; obj.y = i * 2; obj.active = true;
        pool.release(obj);
    }
    const poolTime = performance.now() - poolStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Without Pool': noPoolTime.toFixed(2) + ' ms',
        'With Pool': poolTime.toFixed(2) + ' ms',
        'Speedup': (noPoolTime / poolTime).toFixed(2) + 'x'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
