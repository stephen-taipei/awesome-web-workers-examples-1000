self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class LRUCache {
    constructor(capacity) { this.capacity = capacity; this.cache = new Map(); }
    get(key) {
        if (!this.cache.has(key)) return null;
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }
    set(key, value) {
        if (this.cache.has(key)) this.cache.delete(key);
        else if (this.cache.size >= this.capacity) this.cache.delete(this.cache.keys().next().value);
        this.cache.set(key, value);
    }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const cache = new LRUCache(100);
    let hits = 0, misses = 0;
    
    sendProgress(50, 'Testing cache...');
    for (let i = 0; i < iterations; i++) {
        const key = 'key' + (i % 150);
        if (cache.get(key)) hits++;
        else { misses++; cache.set(key, { data: i }); }
    }
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Cache Hits': hits,
        'Cache Misses': misses,
        'Hit Rate': (hits / iterations * 100).toFixed(1) + '%',
        'Cache Size': cache.cache.size
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
