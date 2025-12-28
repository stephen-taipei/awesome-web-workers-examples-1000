// Reducer Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const data = Array(param).fill(0).map(() => Math.random() * 100);
        let result = data.reduce((acc, v, i) => {
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: 'Reducing...' } });
            return acc + v;
        }, 0);
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Items': param, 'Reduced Value': result.toFixed(2), 'Avg': (result/param).toFixed(2), 'Duration': duration } });
    }
};