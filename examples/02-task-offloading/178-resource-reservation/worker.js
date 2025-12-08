/**
 * 資源預留 - Worker 腳本
 */

self.onmessage = function(e) {
    const { type, duration, id } = e.data;

    if (type === 'task') {
        // 模擬任務執行
        setTimeout(() => {
            self.postMessage({
                type: 'complete',
                taskId: id
            });
        }, duration);
    }
};
