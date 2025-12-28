/**
 * #604 Dynamic Pool Worker
 * Worker for dynamic pool execution
 */

self.onmessage = function(e) {
    const { type, data } = e.data;

    if (type === 'execute') {
        executeTask(data);
    }
};

function executeTask(data) {
    const startTime = performance.now();
    let result = 0;

    for (let i = 0; i < data.iterations; i++) {
        result += Math.sqrt(i) * Math.sin(i * 0.001);
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'complete',
        data: {
            taskId: data.taskId,
            result,
            iterations: data.iterations,
            duration: endTime - startTime
        }
    });
}
