// Barrier Sync Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const parties = 4;
        let barriers = 0, waiting = 0;
        for (let i = 0; i < param; i++) {
            waiting++;
            if (waiting >= parties) { barriers++; waiting = 0; }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Barriers: ${barriers}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Barriers': barriers, 'Parties': parties, 'Duration': duration } });
    }
};