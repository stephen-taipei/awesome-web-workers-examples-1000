/* worker.js */
self.onmessage = function(e) {
    const { taskId, duration } = e.data;

    // Simulate work
    const start = Date.now();

    // Check for termination every 100ms
    const interval = setInterval(() => {
        if (Date.now() - start >= duration) {
            clearInterval(interval);
            self.postMessage({ taskId, status: 'completed' });
        }
    }, 100);
};
