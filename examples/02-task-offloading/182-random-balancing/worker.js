// Reuse worker logic
self.onmessage = function(e) {
    const { taskId, duration } = e.data;
    setTimeout(() => {
        self.postMessage({
            taskId: taskId,
            status: 'completed'
        });
    }, duration);
};
