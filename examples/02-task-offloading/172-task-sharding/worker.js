// Worker Thread

self.onmessage = function(e) {
    const { start, end } = e.data;

    // We are summing numbers from start to end (inclusive)
    // Using BigInt for large numbers

    let sum = 0n;
    const total = end - start + 1n;

    // Report progress every ~1% or every N iterations to avoid flooding
    const updateInterval = total / 100n;
    // Ensure we don't report too often (e.g., minimum 1000 iterations)
    const safeInterval = updateInterval > 1000n ? updateInterval : 1000n;

    let counter = 0n;

    for (let i = start; i <= end; i++) {
        sum += i;
        counter++;

        if (counter % safeInterval === 0n) {
            const progress = Number(counter * 100n / total);
            self.postMessage({ type: 'progress', data: progress });
        }
    }

    self.postMessage({ type: 'result', data: sum });
};
