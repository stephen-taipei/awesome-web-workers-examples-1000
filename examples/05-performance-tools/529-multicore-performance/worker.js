self.onmessage = function(e) {
    const { start, end } = e.data;

    // 計算範圍內的質數數量 (CPU bound task)
    let count = 0;
    for (let n = start; n <= end; n++) {
        if (isPrime(n)) {
            count++;
        }
    }

    self.postMessage({ type: 'complete', count: count });
};

function isPrime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;

    // 使用簡單的試除法，計算量足夠大
    for (let i = 5; i * i <= n; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
}
