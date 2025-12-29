// Rate Limiter Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const rateLimit = 100; // requests per second
        const window = 1000; // 1 second window

        let allowed = 0;
        let rejected = 0;
        const timestamps = [];

        for (let i = 0; i < param; i++) {
            const now = i * 10; // Simulate 10ms between requests

            // Remove old timestamps
            while (timestamps.length > 0 && timestamps[0] < now - window) {
                timestamps.shift();
            }

            if (timestamps.length < rateLimit) {
                timestamps.push(now);
                allowed++;
            } else {
                rejected++;
            }

            if (i % 100 === 0) {
                postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Processed: ${i}, Rejected: ${rejected}` } });
            }
        }

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total Requests': param, 'Allowed': allowed, 'Rejected': rejected, 'Reject Rate': (rejected / param * 100).toFixed(1) + '%', 'Duration': duration } });
    }
};
