/**
 * 163. 任務去重 - Worker
 */

self.onmessage = function(e) {
    const { id, duration } = e.data;

    // 模擬耗時操作
    setTimeout(() => {
        const result = `任務 ${id} 的計算結果 (時間戳: ${Date.now()})`;
        self.postMessage({ id, result });
    }, duration);
};
