// Windowed Processor Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const windowSize = 100;
        const windows = [];
        let window = [];
        for (let i = 0; i < param; i++) {
            window.push(Math.random() * 100);
            if (window.length >= windowSize) {
                windows.push(window.reduce((a, b) => a + b) / window.length);
                window = [];
            }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: 'Processing windows...' } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Items': param, 'Windows': windows.length, 'Window Size': windowSize, 'Duration': duration } });
    }
};