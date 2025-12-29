// Accumulator Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        let acc = { total: 0, squares: 0, count: 0 };
        for (let i = 0; i < param; i++) {
            const v = Math.random() * 100;
            acc.total += v; acc.squares += v * v; acc.count++;
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: 'Accumulating...' } });
        }
        const mean = acc.total / acc.count;
        const variance = (acc.squares / acc.count) - (mean * mean);
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Count': acc.count, 'Mean': mean.toFixed(2), 'Variance': variance.toFixed(2), 'StdDev': Math.sqrt(variance).toFixed(2), 'Duration': duration } });
    }
};