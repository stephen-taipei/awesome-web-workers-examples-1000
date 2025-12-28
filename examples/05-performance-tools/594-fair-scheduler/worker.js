// Fair Scheduler Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const queues = [0, 0, 0, 0];
        for (let i = 0; i < param; i++) {
            const minIdx = queues.indexOf(Math.min(...queues));
            queues[minIdx]++;
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Distributing...` } });
        }
        const duration = performance.now() - startTime;
        const variance = queues.reduce((s, q) => s + Math.pow(q - param/4, 2), 0) / 4;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Variance': variance.toFixed(2), 'Fairness': (100 - Math.sqrt(variance)).toFixed(1) + '%', 'Duration': duration } });
    }
};