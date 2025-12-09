// 模擬繁重計算任務
self.onmessage = function(e) {
    const { taskId, duration, type } = e.data;

    // 模擬任務進度
    const steps = 20;
    const stepTime = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
        currentStep++;

        // 執行一些實際的計算以佔用 CPU (短暫)
        const start = performance.now();
        while (performance.now() - start < Math.min(stepTime * 0.8, 50)) { // 限制最大阻塞時間，保持響應
            Math.sqrt(Math.random() * 100000);
        }

        const progress = Math.round((currentStep / steps) * 100);

        if (currentStep >= steps) {
            clearInterval(interval);
            self.postMessage({
                type: 'complete',
                taskId: taskId,
                result: `Task ${taskId} completed`,
                duration: duration
            });
        } else {
            self.postMessage({
                type: 'progress',
                taskId: taskId,
                progress: progress
            });
        }
    }, stepTime);
};
