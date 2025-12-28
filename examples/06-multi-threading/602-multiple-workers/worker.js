/**
 * #602 Multiple Workers
 * Worker instance for parallel computation
 */

self.onmessage = function(e) {
    const { type, data } = e.data;

    if (type === 'start') {
        performCalculation(data.workerId, data.count);
    }
};

function performCalculation(workerId, count) {
    const startTime = performance.now();
    let result = 0;
    const reportInterval = Math.floor(count / 100);

    for (let i = 0; i < count; i++) {
        // Different calculation per worker for variety
        result += Math.sqrt(i + workerId * 1000) * Math.cos(i * 0.001);

        if (i % reportInterval === 0) {
            const percent = Math.floor((i / count) * 100);
            self.postMessage({
                type: 'progress',
                data: {
                    percent,
                    message: `Processing: ${percent}%`
                }
            });
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        data: {
            workerId,
            count,
            result,
            duration: endTime - startTime
        }
    });
}
