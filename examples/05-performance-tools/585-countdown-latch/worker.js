// Countdown Latch Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const batchSize = 100;
        let latches = 0, count = batchSize;
        for (let i = 0; i < param; i++) {
            count--;
            if (count <= 0) { latches++; count = batchSize; }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Count: ${count}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Latches': latches, 'Batch Size': batchSize, 'Duration': duration } });
    }
};