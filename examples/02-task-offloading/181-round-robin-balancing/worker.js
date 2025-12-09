// Reuse worker logic but simplified
self.onmessage = function(e) {
    const { taskId, duration } = e.data;

    // Simulate work
    setTimeout(() => {
        self.postMessage({
            taskId: taskId,
            status: 'completed'
        });
    }, duration);
};
