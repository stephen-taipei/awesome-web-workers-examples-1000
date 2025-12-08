// 簡單的 Worker
self.onmessage = function(e) {
    const { type, taskId, duration, startTime } = e.data;

    if (type === 'task') {
        setTimeout(() => {
            self.postMessage({
                type: 'completed',
                taskId: taskId,
                startTime: startTime,
                result: 'Done'
            });
        }, duration);
    }
};
