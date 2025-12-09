// Lazy Evaluation - Web Worker

let cache = new Map();
let stats = {
    computed: 0,
    requested: 0,
    cacheHits: 0,
    potentialCompute: 0
};

self.onmessage = function(e) {
    const data = e.data;

    if (data.type === 'lazy') {
        runLazyEvaluation(data);
    } else if (data.type === 'eager') {
        runEagerEvaluation(data);
    }
};

function runLazyEvaluation(config) {
    const { scenario, requestCount, batchSize, delayMs, cacheEnabled } = config;

    cache.clear();
    stats = {
        computed: 0,
        requested: 0,
        cacheHits: 0,
        potentialCompute: requestCount * 2
    };

    // Create lazy generator based on scenario
    const generator = createGenerator(scenario);

    // Process requests in batches with delays
    processLazyRequests(generator, requestCount, batchSize, delayMs, cacheEnabled, scenario);
}

function processLazyRequests(generator, total, batchSize, delayMs, cacheEnabled, scenario) {
    let processed = 0;

    function processBatch() {
        const batchEnd = Math.min(processed + batchSize, total);

        for (let i = processed; i < batchEnd; i++) {
            const startTime = performance.now();
            let value, cached = false;

            if (cacheEnabled && cache.has(i)) {
                // Cache hit
                value = cache.get(i);
                cached = true;
                stats.cacheHits++;
            } else {
                // Compute value lazily
                value = computeValue(scenario, i);
                stats.computed++;

                if (cacheEnabled) {
                    cache.set(i, value);
                }
            }

            stats.requested++;

            self.postMessage({
                type: 'value',
                index: i,
                value,
                cached,
                computeTime: performance.now() - startTime
            });
        }

        processed = batchEnd;

        if (processed < total) {
            setTimeout(processBatch, delayMs);
        } else {
            self.postMessage({
                type: 'complete',
                stats
            });
        }
    }

    processBatch();
}

function createGenerator(scenario) {
    switch (scenario) {
        case 'fibonacci':
            return fibonacciGenerator();
        case 'primes':
            return primeGenerator();
        case 'datastream':
            return dataStreamGenerator();
        case 'tree':
            return treeGenerator();
        default:
            return fibonacciGenerator();
    }
}

function* fibonacciGenerator() {
    let a = 0n, b = 1n;
    while (true) {
        yield a;
        [a, b] = [b, a + b];
    }
}

function* primeGenerator() {
    const primes = [];
    let num = 2;

    while (true) {
        if (isPrime(num, primes)) {
            primes.push(num);
            yield num;
        }
        num++;
    }
}

function isPrime(n, knownPrimes) {
    const sqrt = Math.sqrt(n);
    for (const p of knownPrimes) {
        if (p > sqrt) break;
        if (n % p === 0) return false;
    }
    return true;
}

function* dataStreamGenerator() {
    let id = 0;
    while (true) {
        yield {
            id: id++,
            timestamp: Date.now(),
            value: Math.random() * 1000,
            processed: false
        };
    }
}

function* treeGenerator() {
    let nodeId = 0;

    function* generateNode(depth, maxDepth) {
        if (depth > maxDepth) return;

        const node = {
            id: nodeId++,
            depth,
            value: Math.random() * 100,
            children: []
        };

        yield node;

        // Lazily generate children
        const childCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < childCount; i++) {
            yield* generateNode(depth + 1, maxDepth);
        }
    }

    yield* generateNode(0, 10);
}

function computeValue(scenario, index) {
    switch (scenario) {
        case 'fibonacci':
            return computeFibonacci(index);
        case 'primes':
            return computeNthPrime(index);
        case 'datastream':
            return computeDataItem(index);
        case 'tree':
            return computeTreeNode(index);
        default:
            return computeFibonacci(index);
    }
}

function computeFibonacci(n) {
    // Use BigInt for large Fibonacci numbers
    if (n <= 1) return n;

    let a = 0n, b = 1n;
    for (let i = 2; i <= n; i++) {
        [a, b] = [b, a + b];

        // Simulate computation time
        if (i % 10 === 0) {
            simulateWork(10);
        }
    }

    // Convert to number if small enough, otherwise to string
    const result = b;
    return result <= Number.MAX_SAFE_INTEGER ? Number(result) : result.toString();
}

function computeNthPrime(n) {
    const primes = [];
    let num = 2;

    while (primes.length <= n) {
        let isPrime = true;
        const sqrt = Math.sqrt(num);

        for (const p of primes) {
            if (p > sqrt) break;
            if (num % p === 0) {
                isPrime = false;
                break;
            }
        }

        if (isPrime) {
            primes.push(num);
        }
        num++;

        // Simulate work
        if (num % 100 === 0) {
            simulateWork(5);
        }
    }

    return primes[n];
}

function computeDataItem(index) {
    // Simulate data processing pipeline
    const raw = generateRawData(index);
    const filtered = filterData(raw);
    const transformed = transformData(filtered);
    const aggregated = aggregateData(transformed);

    simulateWork(20);

    return {
        index,
        original: raw,
        result: aggregated
    };
}

function generateRawData(index) {
    return {
        id: index,
        values: Array(10).fill(0).map((_, i) => Math.sin(index + i) * 100)
    };
}

function filterData(data) {
    return {
        ...data,
        values: data.values.filter(v => v > 0)
    };
}

function transformData(data) {
    return {
        ...data,
        values: data.values.map(v => v * 2 + 10)
    };
}

function aggregateData(data) {
    const sum = data.values.reduce((a, b) => a + b, 0);
    const avg = sum / (data.values.length || 1);
    return { sum: sum.toFixed(2), avg: avg.toFixed(2), count: data.values.length };
}

function computeTreeNode(index) {
    // Generate tree node lazily
    const depth = Math.floor(Math.log2(index + 1));
    const positionInLevel = index - (Math.pow(2, depth) - 1);

    simulateWork(15);

    return {
        id: index,
        depth,
        position: positionInLevel,
        value: Math.sin(index) * 100,
        parentId: index > 0 ? Math.floor((index - 1) / 2) : null
    };
}

function runEagerEvaluation(config) {
    const { scenario, totalCount } = config;

    // Compute ALL values upfront (eager evaluation)
    const results = [];

    for (let i = 0; i < totalCount; i++) {
        const value = computeValue(scenario, i);
        results.push(value);
    }

    self.postMessage({
        type: 'eager_complete',
        count: results.length
    });
}

function simulateWork(iterations) {
    let result = 0;
    for (let i = 0; i < iterations; i++) {
        result += Math.sin(i) * Math.cos(i);
    }
    return result;
}
