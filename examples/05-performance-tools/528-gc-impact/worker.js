let timerId;
let garbage = [];
let lastTick = 0;

self.onmessage = function(e) {
    const { action, config } = e.data;

    if (action === 'start') {
        runTest(config);
    } else if (action === 'stop') {
        stopTest();
    }
};

function runTest(config) {
    stopTest();

    const { objectCount, interval } = config;
    lastTick = performance.now();

    // 定期分配大量物件並立即釋放(或者保留一部分)
    // 為了製造 GC 壓力，我們不斷創建新物件替換舊的引用

    timerId = setInterval(() => {
        const now = performance.now();
        const latency = now - lastTick - interval; // 實際延遲 - 預期延遲 (理想為0)
        lastTick = now;

        // 1. Memory Pressure
        // Allocate temporary objects
        const tempGarbage = [];
        for (let i = 0; i < objectCount; i++) {
            tempGarbage.push({ id: i, data: new Array(10).fill(Math.random()) });
        }

        // 2. Persistent Memory Churn
        // Replace part of the persistent array to force minor/major GC
        // garbage array grows until a limit then cycles
        if (garbage.length > 5000) {
            garbage = []; // Major cleanup opportunity
        }
        for (let i = 0; i < 1000; i++) {
            garbage.push({ type: 'persistent', ts: now });
        }

        // Get Memory Info if available
        let memoryInfo = null;
        if (self.performance && self.performance.memory) {
            memoryInfo = {
                usedJSHeapSize: self.performance.memory.usedJSHeapSize,
                totalJSHeapSize: self.performance.memory.totalJSHeapSize
            };
        }

        self.postMessage({
            type: 'tick',
            data: {
                latency: Math.max(0, latency), // Only care about delay
                memory: memoryInfo
            }
        });

    }, interval);
}

function stopTest() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
    }
    garbage = [];
}
