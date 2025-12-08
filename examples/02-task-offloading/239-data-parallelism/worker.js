// Data Parallelism - Worker

self.onmessage = function(e) {
    const { type, operation, chunk, chunkIndex } = e.data;

    if (type === 'process') {
        processChunk(operation, chunk, chunkIndex);
    }
};

function processChunk(operation, chunk, chunkIndex) {
    const startTime = performance.now();
    let result;

    switch (operation) {
        case 'map':
            result = mapOperation(chunk);
            break;
        case 'filter':
            result = filterOperation(chunk);
            break;
        case 'reduce':
            result = reduceOperation(chunk);
            break;
        case 'mapreduce':
            result = mapReduceOperation(chunk);
            break;
    }

    const time = performance.now() - startTime;

    self.postMessage({
        type: 'result',
        result,
        chunkIndex,
        time,
        elementsProcessed: chunk.length
    });
}

function mapOperation(chunk) {
    const result = [];
    const len = chunk.length;
    const reportInterval = Math.max(1, Math.floor(len / 10));

    for (let i = 0; i < len; i++) {
        const x = chunk[i];
        // Quadratic transform: x² + 2x + 1 = (x + 1)²
        result.push(x * x + 2 * x + 1);

        // Report progress
        if (i % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                progress: (i / len) * 100
            });
        }
    }

    return result;
}

function filterOperation(chunk) {
    const result = [];
    const len = chunk.length;
    const reportInterval = Math.max(1, Math.floor(len / 10));

    for (let i = 0; i < len; i++) {
        const x = chunk[i];

        // Keep if prime or divisible by 7
        if (isPrime(x) || x % 7 === 0) {
            result.push(x);
        }

        if (i % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                progress: (i / len) * 100
            });
        }
    }

    return result;
}

function reduceOperation(chunk) {
    let sum = 0;
    let max = -Infinity;
    let min = Infinity;
    const len = chunk.length;
    const reportInterval = Math.max(1, Math.floor(len / 10));

    for (let i = 0; i < len; i++) {
        const x = chunk[i];
        sum += x;
        if (x > max) max = x;
        if (x < min) min = x;

        if (i % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                progress: (i / len) * 100
            });
        }
    }

    return { sum, count: len, max, min };
}

function mapReduceOperation(chunk) {
    const wordCounts = {};
    const len = chunk.length;
    const reportInterval = Math.max(1, Math.floor(len / 10));

    for (let i = 0; i < len; i++) {
        const sentence = chunk[i];
        const words = sentence.toLowerCase().split(/\s+/);

        for (const word of words) {
            if (word) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        }

        if (i % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                progress: (i / len) * 100
            });
        }
    }

    return wordCounts;
}

function isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;

    // More expensive primality test to simulate real computation
    const sqrt = Math.sqrt(n);
    for (let i = 3; i <= sqrt; i += 2) {
        if (n % i === 0) return false;
    }
    return true;
}
