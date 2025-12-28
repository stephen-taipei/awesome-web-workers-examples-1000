self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const cache = new Map();
    const obj = {};
    
    sendProgress(25, 'Testing Map cache...');
    const mapStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const key = 'key' + (i % 100);
        if (!cache.has(key)) cache.set(key, i);
        cache.get(key);
    }
    const mapTime = performance.now() - mapStart;
    
    sendProgress(50, 'Testing Object cache...');
    const objStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const key = 'key' + (i % 100);
        if (!obj[key]) obj[key] = i;
        obj[key];
    }
    const objTime = performance.now() - objStart;
    
    sendProgress(75, 'Testing WeakMap (with objects)...');
    const weakMap = new WeakMap();
    const keys = Array.from({ length: 100 }, () => ({}));
    const weakStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const key = keys[i % 100];
        if (!weakMap.has(key)) weakMap.set(key, i);
        weakMap.get(key);
    }
    const weakTime = performance.now() - weakStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: { 'Map': mapTime, 'Object': objTime, 'WeakMap': weakTime } });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
