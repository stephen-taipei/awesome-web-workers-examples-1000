self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class ResourcePool {
    constructor(factory, size) {
        this.available = Array.from({ length: size }, factory);
        this.inUse = [];
    }
    acquire() {
        const resource = this.available.pop();
        if (resource) this.inUse.push(resource);
        return resource;
    }
    release(resource) {
        const idx = this.inUse.indexOf(resource);
        if (idx > -1) { this.inUse.splice(idx, 1); this.available.push(resource); }
    }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    
    sendProgress(25, 'Without pool...');
    const noPoolStart = performance.now();
    for (let i = 0; i < iterations; i++) { const obj = { data: new Array(100).fill(i) }; }
    const noPoolTime = performance.now() - noPoolStart;
    
    sendProgress(60, 'With pool...');
    const pool = new ResourcePool(() => ({ data: new Array(100) }), 10);
    const poolStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const obj = pool.acquire();
        if (obj) { obj.data.fill(i); pool.release(obj); }
    }
    const poolTime = performance.now() - poolStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Without Pool': noPoolTime.toFixed(2) + ' ms',
        'With Pool': poolTime.toFixed(2) + ' ms',
        'Improvement': ((1 - poolTime / noPoolTime) * 100).toFixed(1) + '%'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
