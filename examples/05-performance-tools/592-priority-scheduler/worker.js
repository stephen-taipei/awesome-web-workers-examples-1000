// Priority Scheduler Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const tasks = Array(param).fill(0).map((_, i) => ({ id: i, priority: Math.floor(Math.random() * 10) }));
        tasks.sort((a, b) => b.priority - a.priority);
        let processed = 0;
        tasks.forEach((t, i) => {
            processed++;
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Priority: ${t.priority}` } });
        });
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Processed': processed, 'Duration': duration } });
    }
};