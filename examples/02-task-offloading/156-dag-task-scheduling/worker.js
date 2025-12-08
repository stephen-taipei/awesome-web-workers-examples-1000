// The Worker calculates the task
self.onmessage = function(e) {
    const { taskId, duration } = e.data;

    // Simulate processing
    setTimeout(() => {
        // Return result
        self.postMessage({
            taskId: taskId,
            status: 'completed',
            result: `Result for task ${taskId}`
        });
    }, duration);
};
