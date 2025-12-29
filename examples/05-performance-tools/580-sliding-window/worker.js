// Sliding Window Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const windowSize = 10;
        const window = [];
        const averages = [];
        for (let i = 0; i < param; i++) {
            window.push(Math.random() * 100);
            if (window.length > windowSize) window.shift();
            if (window.length === windowSize) averages.push(window.reduce((a, b) => a + b) / windowSize);
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: 'Sliding...' } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Items': param, 'Averages': averages.length, 'Window Size': windowSize, 'Duration': duration } });
    }
};