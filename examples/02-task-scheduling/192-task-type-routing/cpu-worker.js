// CPU 密集型 Worker
// 負責執行計算密集型任務，例如計算費波那契數

function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

self.onmessage = function(e) {
    const { id, complexity } = e.data;
    const startTime = performance.now();

    let n;
    switch (complexity) {
        case 'low': n = 35; break;
        case 'medium': n = 40; break;
        case 'high': n = 42; break;
        default: n = 35;
    }

    const result = fibonacci(n);
    const endTime = performance.now();

    self.postMessage({
        id,
        result,
        duration: (endTime - startTime).toFixed(2)
    });
};
