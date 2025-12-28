// Load Distributor Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const workers = [0, 0, 0, 0]; // Load on 4 virtual workers

        for (let i = 0; i < param; i++) {
            // Find least loaded worker
            const minIdx = workers.indexOf(Math.min(...workers));
            const taskWeight = 1 + Math.random() * 3;
            workers[minIdx] += taskWeight;

            if (i % 100 === 0) {
                postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Distributing task ${i + 1}/${param}` } });
            }
        }

        const duration = performance.now() - startTime;
        const variance = workers.reduce((sum, w) => sum + Math.pow(w - workers.reduce((a, b) => a + b) / 4, 2), 0) / 4;
        postMessage({ type: 'RESULT', payload: { 'Total Tasks': param, 'Load Variance': variance.toFixed(2), 'Balance Score': (100 - Math.sqrt(variance)).toFixed(1) + '%', 'Duration': duration } });
    }
};
