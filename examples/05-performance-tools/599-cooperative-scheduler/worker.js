// Cooperative Scheduler Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        let yields = 0, runs = 0;
        for (let i = 0; i < param; i++) {
            runs++;
            if (Math.random() > 0.7) yields++;
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Yields: ${yields}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Runs': runs, 'Yields': yields, 'Yield Rate': (yields/runs*100).toFixed(1) + '%', 'Duration': duration } });
    }
};