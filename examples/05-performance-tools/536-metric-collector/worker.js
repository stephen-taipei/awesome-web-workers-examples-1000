self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class MetricCollector {
    constructor() { this.metrics = new Map(); }
    record(name, value) {
        if (!this.metrics.has(name)) this.metrics.set(name, []);
        this.metrics.get(name).push({ value, time: performance.now() });
    }
    getStats(name) {
        const values = this.metrics.get(name)?.map(m => m.value) || [];
        if (values.length === 0) return null;
        const sum = values.reduce((a, b) => a + b, 0);
        const sorted = [...values].sort((a, b) => a - b);
        return { count: values.length, min: sorted[0], max: sorted[sorted.length-1], avg: sum / values.length, p50: sorted[Math.floor(values.length * 0.5)], p99: sorted[Math.floor(values.length * 0.99)] };
    }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const collector = new MetricCollector();
    
    sendProgress(50, 'Collecting metrics...');
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        Math.sqrt(i);
        collector.record('sqrt_latency', performance.now() - start);
        collector.record('value', Math.random() * 100);
    }
    
    sendProgress(100, 'Complete');
    const latencyStats = collector.getStats('sqrt_latency');
    const valueStats = collector.getStats('value');
    
    self.postMessage({ type: 'RESULT', payload: {
        'Samples': latencyStats.count,
        'Avg Latency': (latencyStats.avg * 1000).toFixed(4) + ' us',
        'P99 Latency': (latencyStats.p99 * 1000).toFixed(4) + ' us',
        'Value Min': valueStats.min.toFixed(2),
        'Value Max': valueStats.max.toFixed(2)
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
