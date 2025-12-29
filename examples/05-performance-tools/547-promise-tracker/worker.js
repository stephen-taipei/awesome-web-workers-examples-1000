self.onmessage = async function(e) {
    if (e.data.type === 'START') await runBenchmark(e.data.payload.param);
};

class PromiseTracker {
    constructor() { this.promises = []; }
    track(name, promise) {
        const entry = { name, created: performance.now(), resolved: null, rejected: null };
        this.promises.push(entry);
        return promise.then(r => { entry.resolved = performance.now(); return r; })
            .catch(e => { entry.rejected = performance.now(); throw e; });
    }
    getStats() {
        const resolved = this.promises.filter(p => p.resolved);
        const durations = resolved.map(p => p.resolved - p.created);
        return {
            total: this.promises.length,
            resolved: resolved.length,
            avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length
        };
    }
}

async function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const tracker = new PromiseTracker();
    
    sendProgress(50, 'Tracking promises...');
    const promises = [];
    for (let i = 0; i < Math.min(iterations, 1000); i++) {
        promises.push(tracker.track('promise-' + i, Promise.resolve(i)));
    }
    await Promise.all(promises);
    
    sendProgress(100, 'Complete');
    const stats = tracker.getStats();
    self.postMessage({ type: 'RESULT', payload: {
        'Total Tracked': stats.total,
        'Resolved': stats.resolved,
        'Avg Duration': stats.avgDuration.toFixed(4) + ' ms'
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
