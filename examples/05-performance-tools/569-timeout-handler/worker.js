// Timeout Handler Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();

        let completed = 0;
        let timedOut = 0;
        const timeout = 50; // ms

        for (let i = 0; i < param; i++) {
            const operationTime = Math.random() * 100;

            if (operationTime <= timeout) {
                completed++;
            } else {
                timedOut++;
            }

            if (i % 100 === 0) {
                postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Timeouts: ${timedOut}` } });
            }
        }

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total Operations': param, 'Completed': completed, 'Timed Out': timedOut, 'Timeout Rate': (timedOut / param * 100).toFixed(1) + '%', 'Duration': duration } });
    }
};
