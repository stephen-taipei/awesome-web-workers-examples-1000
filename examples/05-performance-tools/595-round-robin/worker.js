// Round Robin Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const workers = [0, 0, 0, 0];
        let current = 0;
        for (let i = 0; i < param; i++) {
            workers[current]++;
            current = (current + 1) % 4;
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Worker: ${current}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'W0': workers[0], 'W1': workers[1], 'W2': workers[2], 'W3': workers[3], 'Duration': duration } });
    }
};