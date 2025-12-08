/**
 * 多池協調 - Worker 腳本
 */

self.onmessage = function(e) {
    const { type, jobId, stage, duration } = e.data;

    if (type === 'process') {
        // 模擬處理時間
        setTimeout(() => {
            self.postMessage({
                type: 'complete',
                jobId: jobId,
                stage: stage
            });
        }, duration);
    }
};
