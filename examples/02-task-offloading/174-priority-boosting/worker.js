// Worker Thread

self.onmessage = function(e) {
    const { taskId, duration } = e.data;

    // Simulate work
    const start = performance.now();

    // Busy wait simulation
    while (performance.now() - start < duration) {
        // burn cycles
    }

    self.postMessage({ type: 'complete', taskId });
};
