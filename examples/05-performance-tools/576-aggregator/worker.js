// Aggregator Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        let sum = 0, count = 0, min = Infinity, max = -Infinity;
        for (let i = 0; i < param; i++) {
            const v = Math.random() * 100;
            sum += v; count++; min = Math.min(min, v); max = Math.max(max, v);
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: 'Aggregating...' } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Count': count, 'Sum': sum.toFixed(2), 'Avg': (sum/count).toFixed(2), 'Min': min.toFixed(2), 'Max': max.toFixed(2), 'Duration': duration } });
    }
};