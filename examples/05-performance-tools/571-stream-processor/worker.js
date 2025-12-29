// Stream Processor Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();

        let processed = 0;
        let filtered = 0;
        let transformed = 0;

        for (let i = 0; i < param; i++) {
            const value = Math.random() * 100;

            // Filter
            if (value > 20) {
                filtered++;
                // Transform
                const transformed_val = value * 2 + 10;
                if (transformed_val > 50) transformed++;
                processed++;
            }

            if (i % 100 === 0) {
                postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Streaming: ${i}/${param}` } });
            }
        }

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Input Size': param, 'After Filter': filtered, 'Transformed': transformed, 'Throughput': (param / duration * 1000).toFixed(0) + '/s', 'Duration': duration } });
    }
};
