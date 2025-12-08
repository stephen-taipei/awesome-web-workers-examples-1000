/**
 * 動態負載均衡 - Worker 腳本
 */

let power = 1; // 預設處理能力 (1x)

self.onmessage = function(e) {
    const { type, task, power: newPower } = e.data;

    if (type === 'init') {
        power = newPower || 1;
    } else if (type === 'task') {
        // 模擬任務處理
        // 實際執行時間 = 任務複雜度 / Worker 能力
        const executionTime = task.complexity / power;

        // 模擬阻塞運算 (雖然在 Worker 內用 setTimeout 模擬非同步更常見，
        // 但為了模擬佔用 CPU，我們可以用 while loop，不過為了不讓瀏覽器警告，
        // 這裡還是用 setTimeout 模擬任務完成的延遲)
        setTimeout(() => {
            self.postMessage({
                type: 'complete',
                taskId: task.id,
                duration: executionTime
            });
        }, executionTime);
    }
};
