// Fallback Handler Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();

        let primary = 0;
        let fallback = 0;
        let cached = 0;

        for (let i = 0; i < param; i++) {
            const rand = Math.random();

            if (rand > 0.3) {
                primary++;
            } else if (rand > 0.1) {
                fallback++;
            } else {
                cached++;
            }

            if (i % 100 === 0) {
                postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Primary: ${primary}, Fallback: ${fallback}` } });
            }
        }

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total Requests': param, 'Primary Success': primary, 'Fallback Used': fallback, 'Cache Hit': cached, 'Duration': duration } });
    }
};
