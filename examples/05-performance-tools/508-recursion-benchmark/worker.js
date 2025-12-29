/**
 * #508 Recursion Benchmark - Worker Thread
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    if (type === 'START') runBenchmark(payload.depth);
};

function runBenchmark(depth) {
    sendProgress(0, 'Starting recursion benchmark...');

    // Recursive Fibonacci
    sendProgress(10, 'Testing recursive Fibonacci...');
    const recursiveStart = performance.now();
    const recResult = fibRecursive(depth);
    const recursiveTime = performance.now() - recursiveStart;

    // Iterative Fibonacci
    sendProgress(50, 'Testing iterative Fibonacci...');
    const iterativeStart = performance.now();
    const iterResult = fibIterative(depth);
    const iterativeTime = performance.now() - iterativeStart;

    // Memoized Fibonacci
    sendProgress(75, 'Testing memoized Fibonacci...');
    const memo = {};
    const memoizedStart = performance.now();
    const memoResult = fibMemoized(depth, memo);
    const memoizedTime = performance.now() - memoizedStart;

    sendProgress(100, 'Benchmark complete');

    self.postMessage({
        type: 'RESULT',
        payload: {
            depth,
            recursiveTime,
            iterativeTime,
            memoizedTime,
            result: iterResult.toString()
        }
    });
}

function fibRecursive(n) {
    if (n <= 1) return n;
    return fibRecursive(n - 1) + fibRecursive(n - 2);
}

function fibIterative(n) {
    if (n <= 1) return BigInt(n);
    let a = BigInt(0), b = BigInt(1);
    for (let i = 2; i <= n; i++) {
        const temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

function fibMemoized(n, memo) {
    if (n <= 1) return n;
    if (memo[n]) return memo[n];
    memo[n] = fibMemoized(n - 1, memo) + fibMemoized(n - 2, memo);
    return memo[n];
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
