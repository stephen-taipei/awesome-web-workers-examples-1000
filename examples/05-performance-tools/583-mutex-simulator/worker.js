// Mutex Simulator Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        let locked = false, acquired = 0, contention = 0;
        for (let i = 0; i < param; i++) {
            if (!locked) { locked = true; acquired++; locked = false; }
            else { contention++; acquired++; }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Locked: ${locked}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Acquired': acquired, 'Contention': contention, 'Duration': duration } });
    }
};