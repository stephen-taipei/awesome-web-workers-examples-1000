self.onmessage = function(e) {
    const { duration } = e.data;

    // Simulate long running task
    const start = Date.now();
    while (Date.now() - start < duration) {
        // Busy wait
    }

    self.postMessage({ status: 'completed', result: `Task finished after ${duration}ms` });
};
