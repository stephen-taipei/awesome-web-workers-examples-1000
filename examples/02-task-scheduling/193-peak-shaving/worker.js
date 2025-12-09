// 模擬耗時任務
self.onmessage = function(e) {
    const { id, duration } = e.data;

    // 模擬計算/IO 耗時
    setTimeout(() => {
        self.postMessage({ id, result: 'Done' });
    }, duration);
};
