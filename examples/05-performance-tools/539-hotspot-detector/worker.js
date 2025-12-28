self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class HotspotDetector {
    constructor() { this.timings = new Map(); }
    measure(name, fn) {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        if (!this.timings.has(name)) this.timings.set(name, { total: 0, count: 0 });
        const t = this.timings.get(name);
        t.total += duration;
        t.count++;
        return result;
    }
    getHotspots() {
        return [...this.timings.entries()]
            .map(([name, t]) => ({ name, total: t.total, count: t.count, avg: t.total / t.count }))
            .sort((a, b) => b.total - a.total);
    }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const detector = new HotspotDetector();
    
    sendProgress(50, 'Detecting hotspots...');
    for (let i = 0; i < iterations; i++) {
        detector.measure('sqrt', () => Math.sqrt(i));
        detector.measure('sin', () => Math.sin(i));
        if (i % 10 === 0) detector.measure('heavy', () => { for (let j = 0; j < 100; j++) Math.random(); });
    }
    
    sendProgress(100, 'Complete');
    const hotspots = detector.getHotspots();
    
    self.postMessage({ type: 'RESULT', payload: {
        'Hotspot #1': hotspots[0]?.name + ' (' + hotspots[0]?.total.toFixed(2) + ' ms)',
        'Hotspot #2': hotspots[1]?.name + ' (' + hotspots[1]?.total.toFixed(2) + ' ms)',
        'Hotspot #3': hotspots[2]?.name + ' (' + hotspots[2]?.total.toFixed(2) + ' ms)',
        'Total Functions': hotspots.length
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
