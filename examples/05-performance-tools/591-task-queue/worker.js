// Task Queue Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const queue = [];
        let enqueued = 0, dequeued = 0;
        for (let i = 0; i < param; i++) {
            queue.push({ id: i, priority: Math.random() });
            enqueued++;
            if (queue.length > 10) { queue.shift(); dequeued++; }
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Queue: ${queue.length}` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Enqueued': enqueued, 'Dequeued': dequeued, 'Final Size': queue.length, 'Duration': duration } });
    }
};