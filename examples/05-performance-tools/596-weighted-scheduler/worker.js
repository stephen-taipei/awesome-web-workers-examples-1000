// Weighted Scheduler Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const weights = [4, 3, 2, 1];
        const total = weights.reduce((a, b) => a + b);
        const workers = [0, 0, 0, 0];
        for (let i = 0; i < param; i++) {
            const r = Math.random() * total;
            let sum = 0;
            for (let j = 0; j < weights.length; j++) {
                sum += weights[j];
                if (r < sum) { workers[j]++; break; }
            }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Scheduling...` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'W0(4)': workers[0], 'W1(3)': workers[1], 'W2(2)': workers[2], 'W3(1)': workers[3], 'Duration': duration } });
    }
};