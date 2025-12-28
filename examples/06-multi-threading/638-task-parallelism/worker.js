/**
 * #638 Task Parallelism Worker
 */
self.onmessage = function(e) {
    const start = performance.now();
    let result;

    switch (e.data.op) {
        case 'primes':
            result = countPrimes(10000);
            break;
        case 'sort':
            const arr = Array.from({ length: 10000 }, () => Math.random());
            arr.sort((a, b) => a - b);
            result = 'Sorted 10000 items';
            break;
        case 'fib':
            result = 'Fib(35) = ' + fib(35);
            break;
        case 'matrix':
            result = 'Matrix 50x50 multiplied';
            matrixMultiply(50);
            break;
    }

    self.postMessage({ result, time: (performance.now() - start).toFixed(0) });
};

function countPrimes(n) {
    let count = 0;
    for (let i = 2; i <= n; i++) {
        let prime = true;
        for (let j = 2; j * j <= i; j++) {
            if (i % j === 0) { prime = false; break; }
        }
        if (prime) count++;
    }
    return count + ' primes';
}

function fib(n) {
    return n <= 1 ? n : fib(n - 1) + fib(n - 2);
}

function matrixMultiply(n) {
    const a = Array(n).fill(0).map(() => Array(n).fill(1));
    const b = Array(n).fill(0).map(() => Array(n).fill(1));
    const c = Array(n).fill(0).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
            for (let k = 0; k < n; k++)
                c[i][j] += a[i][k] * b[k][j];
}
