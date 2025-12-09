/* worker.js */
self.onmessage = function(e) {
    const { taskId, duration } = e.data;

    // Simulate work
    setTimeout(() => {
        self.postMessage({ taskId, status: 'completed' });
    }, duration);
};
