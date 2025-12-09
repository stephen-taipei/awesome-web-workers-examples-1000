/**
 * 162. 結果快取 - Worker
 * 負責執行昂貴的計算 (遞迴費波那契數列)
 */

self.onmessage = function(e) {
    const { command, value } = e.data;

    if (command === 'calculate') {
        const start = Date.now();

        // 故意使用效率較差的遞迴算法來模擬耗時計算
        const result = fibonacci(value);

        const end = Date.now();

        self.postMessage({
            n: value,
            result: result,
            duration: end - start
        });
    }
};

// 簡單遞迴，計算 N=40 以上會明顯變慢
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}
