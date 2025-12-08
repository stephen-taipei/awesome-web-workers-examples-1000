/* worker.js */
self.onmessage = function(e) {
    const { taskId, complexity } = e.data;

    // Simulate processing time based on complexity
    const duration = complexity * 100 + Math.random() * 50;

    const start = performance.now();

    // Busy wait simulation
    const endTime = Date.now() + duration;
    while(Date.now() < endTime) {
        // burn cpu
    }

    const end = performance.now();

    self.postMessage({
        taskId,
        actualDuration: end - start,
        status: 'completed'
    });
};
