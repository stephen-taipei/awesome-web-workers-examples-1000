// Concurrent Limiter Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const maxConcurrent = 5;
        let current = 0, completed = 0, queued = 0;
        for (let i = 0; i < param; i++) {
            if (current < maxConcurrent) { current++; completed++; current--; }
            else { queued++; completed++; }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Concurrent: ${current}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Completed': completed, 'Max Concurrent': maxConcurrent, 'Duration': duration } });
    }
};