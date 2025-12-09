// Scatter-Gather Pattern - Web Worker

self.onmessage = function(e) {
    const { workerId, taskType, data, config, shouldFail } = e.data;

    // Simulate failure if requested
    if (shouldFail) {
        simulateWork(data.length, workerId);
        self.postMessage({
            type: 'result',
            workerId,
            error: 'Simulated failure'
        });
        return;
    }

    let result;

    switch (taskType) {
        case 'search':
            result = performSearch(data, config, workerId);
            break;
        case 'aggregate':
            result = performAggregation(data, config, workerId);
            break;
        case 'mapReduce':
            result = performMapReduce(data, config, workerId);
            break;
        case 'bestPrice':
            result = performPriceQuery(data, config, workerId);
            break;
        default:
            result = { error: 'Unknown task type' };
    }

    self.postMessage({
        type: 'result',
        workerId,
        result
    });
};

function simulateWork(dataLength, workerId) {
    // Simulate processing with progress updates
    const chunkSize = Math.ceil(dataLength / 10);
    let processed = 0;

    for (let i = 0; i < dataLength; i++) {
        // Simulate work
        Math.sqrt(Math.random() * 1000);

        processed++;
        if (processed % chunkSize === 0) {
            const percent = Math.round((processed / dataLength) * 100);
            self.postMessage({ type: 'progress', workerId, percent });
        }
    }
}

function performSearch(data, config, workerId) {
    const matches = [];
    const targetValue = 500; // Search for values near 500
    const threshold = 50;

    const chunkSize = Math.ceil(data.length / 10);

    for (let i = 0; i < data.length; i++) {
        const value = data[i];
        const distance = Math.abs(value - targetValue);

        if (distance < threshold) {
            matches.push({
                index: i,
                value: value,
                score: 1 - (distance / threshold),
                shard: workerId
            });
        }

        // Progress update
        if ((i + 1) % chunkSize === 0) {
            const percent = Math.round(((i + 1) / data.length) * 100);
            self.postMessage({ type: 'progress', workerId, percent });
        }
    }

    // Sort by score
    matches.sort((a, b) => b.score - a.score);

    return {
        matches: matches.slice(0, config.query?.limit || 10),
        totalScanned: data.length,
        shard: workerId
    };
}

function performAggregation(data, config, workerId) {
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    const chunkSize = Math.ceil(data.length / 10);

    for (let i = 0; i < data.length; i++) {
        const value = data[i];
        sum += value;
        min = Math.min(min, value);
        max = Math.max(max, value);

        // Progress update
        if ((i + 1) % chunkSize === 0) {
            const percent = Math.round(((i + 1) / data.length) * 100);
            self.postMessage({ type: 'progress', workerId, percent });
        }
    }

    return {
        count: data.length,
        sum: sum,
        min: min,
        max: max,
        avg: sum / data.length,
        shard: workerId
    };
}

function performMapReduce(data, config, workerId) {
    let partialSum = 0;

    const chunkSize = Math.ceil(data.length / 10);

    for (let i = 0; i < data.length; i++) {
        // Map: transform value
        const mappedValue = data[i] * 2;

        // Local reduce: sum
        partialSum += mappedValue;

        // Progress update
        if ((i + 1) % chunkSize === 0) {
            const percent = Math.round(((i + 1) / data.length) * 100);
            self.postMessage({ type: 'progress', workerId, percent });
        }
    }

    return {
        partialSum: partialSum,
        count: data.length,
        shard: workerId
    };
}

function performPriceQuery(data, config, workerId) {
    // Simulate querying a supplier for price
    const suppliers = [
        'AlphaSupply',
        'BetaStore',
        'GammaGoods',
        'DeltaDeals',
        'EpsilonExpress',
        'ZetaZone',
        'EtaEmporium',
        'ThetaTrade'
    ];

    // Simulate network latency
    const latency = 50 + Math.random() * 200;
    const start = performance.now();
    while (performance.now() - start < latency) {
        // Simulate processing
        Math.sqrt(Math.random());
    }

    // Calculate "price" based on data
    let priceBase = 0;
    const sampleSize = Math.min(1000, data.length);
    for (let i = 0; i < sampleSize; i++) {
        priceBase += data[i];
    }
    priceBase = (priceBase / sampleSize) * 0.1 + 10;

    // Add supplier-specific variation
    const supplierVariation = (workerId * 0.05) - 0.1;
    const price = priceBase * (1 + supplierVariation);

    // Random availability
    const available = Math.random() > 0.1;

    // Progress updates during "query"
    for (let p = 10; p <= 100; p += 10) {
        self.postMessage({ type: 'progress', workerId, percent: p });
    }

    return {
        supplier: suppliers[workerId % suppliers.length],
        price: price,
        available: available,
        responseTime: latency,
        shard: workerId
    };
}
