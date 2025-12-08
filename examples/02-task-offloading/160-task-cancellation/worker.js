/**
 * 160. 任務取消 - Worker
 * 模擬一個長時間運行的任務
 */

self.onmessage = function(e) {
    const { command, duration } = e.data;

    if (command === 'start') {
        // 模擬複雜計算
        const startTime = Date.now();

        // 這裡我們不使用 setTimeout，而是使用 busy loop 來模擬 CPU 密集型任務
        // 在真實情況下，如果任務是 CPU 密集的，Worker 無法響應 postMessage
        // 除非我們定期檢查 (但這裡我們依靠 main.js 直接 terminate)

        // 為了讓範例簡單且不完全卡死瀏覽器 (雖然 Worker 是獨立線程)，
        // 我們用一個定期檢查的循環來模擬"工作"，這樣也能展示如果不 terminate，它會一直跑。

        // 注意：Web Worker 最大的優勢是 CPU 密集型任務。
        // 如果我們用 while(true) {}，只有 terminate() 能停止它。

        // 讓我們做一個實際的計算：尋找質數
        let primes = [];
        let current = 2;

        // 使用 setInterval 模擬持續回報或檢查，
        // 但既然 main.js 使用 terminate()，我們其實不需要在這裡做特殊處理來支持取消。
        // terminate() 是強制性的。

        // 我們將執行一個循環直到時間結束
        while (Date.now() - startTime < duration) {
            if (isPrime(current)) {
                primes.push(current);
            }
            current++;
        }

        // 任務完成
        self.postMessage({
            type: 'done',
            data: `找到 ${primes.length} 個質數 (範圍 2-${current})`
        });
    }
};

function isPrime(n) {
    if (n <= 1) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) return false;
    }
    return true;
}
