// Semaphore Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        let semaphore = 3, acquired = 0, waited = 0;
        for (let i = 0; i < param; i++) {
            if (semaphore > 0) { semaphore--; acquired++; semaphore++; }
            else { waited++; acquired++; }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Semaphore: ${semaphore}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Acquired': acquired, 'Waited': waited, 'Duration': duration } });
    }
};