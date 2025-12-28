// Producer Consumer Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const queue = [];
        let produced = 0, consumed = 0;
        for (let i = 0; i < param; i++) {
            if (Math.random() > 0.4) { queue.push(i); produced++; }
            if (queue.length > 0 && Math.random() > 0.3) { queue.shift(); consumed++; }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Queue: ${queue.length}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Produced': produced, 'Consumed': consumed, 'Queue Size': queue.length, 'Duration': duration } });
    }
};