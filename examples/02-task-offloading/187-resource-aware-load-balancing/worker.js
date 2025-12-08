// 簡單的 Worker
self.onmessage = function(e) {
    const { type, taskId, resource, duration } = e.data;

    if (type === 'task') {
        setTimeout(() => {
            self.postMessage({
                type: 'completed',
                taskId: taskId,
                releasedResource: resource, // 任務完成，告知釋放多少資源
                result: 'Done'
            });
        }, duration);
    }
};
