/**
 * 161. 進度追蹤 - Worker
 */

self.onmessage = function(e) {
    const { command, total } = e.data;

    if (command === 'start') {
        const startTime = Date.now();
        let current = 0;

        // 為了不阻塞 Worker 接收訊息（雖然這裡是計算密集型），
        // 並且為了讓主執行緒有機會更新 UI（如果主執行緒很忙），
        // 我們通常會分批處理。但在這個簡單範例中，
        // 我們直接在迴圈中定期 postMessage。

        // 注意：過於頻繁的 postMessage 會降低效能。
        // 我們每處理 1% 或固定數量就回報一次。
        const reportInterval = Math.floor(total / 100); // 每 1% 回報一次

        // 模擬處理迴圈
        for (let i = 0; i < total; i++) {
            // 模擬一些計算工作
            const result = Math.sqrt(i) * Math.sin(i);

            current++;

            // 檢查是否需要回報進度
            if (current % reportInterval === 0 || current === total) {
                const percent = (current / total) * 100;
                self.postMessage({
                    type: 'progress',
                    data: {
                        current: current,
                        total: total,
                        percent: percent
                    }
                });
            }
        }

        const endTime = Date.now();

        self.postMessage({
            type: 'done',
            data: {
                duration: endTime - startTime
            }
        });
    }
};
