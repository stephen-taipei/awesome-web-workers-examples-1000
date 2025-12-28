self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class BufferPool {
    constructor(bufferSize, poolSize) {
        this.bufferSize = bufferSize;
        this.available = Array.from({ length: poolSize }, () => new ArrayBuffer(bufferSize));
        this.inUse = new Set();
    }
    acquire() {
        const buffer = this.available.pop();
        if (buffer) this.inUse.add(buffer);
        return buffer;
    }
    release(buffer) {
        if (this.inUse.has(buffer)) { this.inUse.delete(buffer); this.available.push(buffer); }
    }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const bufferSize = 1024 * 10;
    
    sendProgress(25, 'Without pool...');
    const noPoolStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const buf = new ArrayBuffer(bufferSize);
        new Uint8Array(buf).fill(42);
    }
    const noPoolTime = performance.now() - noPoolStart;
    
    sendProgress(60, 'With pool...');
    const pool = new BufferPool(bufferSize, 10);
    const poolStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const buf = pool.acquire();
        if (buf) { new Uint8Array(buf).fill(42); pool.release(buf); }
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
