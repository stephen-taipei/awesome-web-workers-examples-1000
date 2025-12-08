// Simulates a computation task
self.onmessage = function(e) {
    const { taskId, duration } = e.data;

    // Simulate CPU-intensive work or simply delay
    // We use setTimeout for simplicity here, but in a real scenario
    // this would be actual computation.

    const start = performance.now();

    // Busy wait to actually block the thread (simulate CPU work)
    while (performance.now() - start < duration) {
        // burn CPU
    }

    self.postMessage({
        taskId: taskId,
        duration: duration,
        completedAt: performance.now()
    });
};
