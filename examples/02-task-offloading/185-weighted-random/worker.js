// 簡單的 Worker
self.onmessage = function(e) {
    const { type, taskId, duration } = e.data;

    if (type === 'task') {
        setTimeout(() => {
            self.postMessage({
                type: 'completed',
                taskId: taskId,
                result: 'Done'
            });
        }, duration);
    }
};
