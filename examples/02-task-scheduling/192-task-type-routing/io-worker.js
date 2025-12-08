// IO 密集型 Worker
// 負責執行 IO 密集型任務，這裡使用 setTimeout 模擬網路請求延遲

self.onmessage = function(e) {
    const { id, complexity } = e.data;
    const startTime = performance.now();

    let delay;
    switch (complexity) {
        case 'low': delay = 500; break;
        case 'medium': delay = 1500; break;
        case 'high': delay = 3000; break;
        default: delay = 1000;
    }

    // 模擬網路延遲
    setTimeout(() => {
        const endTime = performance.now();
        self.postMessage({
            id,
            status: 'Success',
            duration: (endTime - startTime).toFixed(2)
        });
    }, delay);
};
