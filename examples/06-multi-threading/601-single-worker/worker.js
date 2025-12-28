/**
 * #601 Single Worker
 * Basic dedicated worker that performs computation
 */

self.onmessage = function(e) {
    const { type, data } = e.data;

    if (type === 'start') {
        performCalculation(data.count);
    }
};

function performCalculation(count) {
    const startTime = performance.now();
    let result = 0;
    const reportInterval = Math.floor(count / 100);

    for (let i = 0; i < count; i++) {
        // Simulate computation
        result += Math.sqrt(i) * Math.sin(i);

        // Report progress periodically
        if (i % reportInterval === 0) {
            const percent = Math.floor((i / count) * 100);
            self.postMessage({
                type: 'progress',
                data: {
                    percent,
                    message: `Processing: ${i.toLocaleString()} / ${count.toLocaleString()}`
                }
            });
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        data: {
            count,
            result,
            duration: endTime - startTime
        }
    });
}
