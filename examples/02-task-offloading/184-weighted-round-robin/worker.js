// 簡單的 Worker
self.onmessage = function(e) {
    const { type, taskId, duration } = e.data;

    if (type === 'task') {
        // 模擬耗時任務
        setTimeout(() => {
            self.postMessage({
                type: 'completed',
                taskId: taskId,
                result: 'Done'
            });
        }, duration);
    }
};
