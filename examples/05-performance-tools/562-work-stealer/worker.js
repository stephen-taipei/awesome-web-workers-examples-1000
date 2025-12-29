// Work Stealer Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const queues = [[], [], [], []]; // 4 work queues

        // Distribute work
        for (let i = 0; i < param; i++) {
            queues[i % 4].push(i);
        }

        let processed = 0;
        let stolen = 0;

        // Simulate work stealing
        while (queues.some(q => q.length > 0)) {
            for (let i = 0; i < 4; i++) {
                if (queues[i].length > 0) {
                    queues[i].pop();
                    processed++;
                } else {
                    // Steal from busiest queue
                    const busiest = queues.reduce((max, q, idx) => q.length > queues[max].length ? idx : max, 0);
                    if (queues[busiest].length > 1) {
                        queues[busiest].pop();
                        stolen++;
                        processed++;
                    }
                }
            }
            postMessage({ type: 'PROGRESS', payload: { percent: Math.round(processed / param * 100), message: `Processed: ${processed}, Stolen: ${stolen}` } });
        }

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total Tasks': param, 'Stolen Tasks': stolen, 'Steal Rate': (stolen / param * 100).toFixed(1) + '%', 'Duration': duration } });
    }
};
