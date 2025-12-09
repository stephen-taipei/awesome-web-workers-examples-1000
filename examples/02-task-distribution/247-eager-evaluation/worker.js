// Eager Evaluation - Web Worker

self.onmessage = function(e) {
    const data = e.data;

    if (data.type === 'compute_chunk') {
        computeChunk(data);
    } else if (data.type === 'lazy_access') {
        runLazyAccess(data);
    }
};

function computeChunk(config) {
    const { scenario, startIdx, endIdx, complexity, workerId } = config;

    const values = [];
    const reportInterval = Math.max(1, Math.floor((endIdx - startIdx) / 20));

    for (let i = startIdx; i < endIdx; i++) {
        const value = computeValue(scenario, i, complexity);
        values.push(value);

        if ((i - startIdx) % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                computed: i - startIdx + 1,
                total: endIdx - startIdx,
                currentIndex: i,
                workerId
            });
        }
    }

    self.postMessage({
        type: 'chunk_complete',
        values,
        startIdx,
        endIdx,
        workerId
    });
}

function computeValue(scenario, index, complexity) {
    const iterations = complexity === 'low' ? 100 :
                      complexity === 'medium' ? 500 :
                      complexity === 'high' ? 2000 : 500;

    switch (scenario) {
        case 'lookup':
            return computeLookupValue(index, iterations);
        case 'precompute':
            return computeExpensiveResult(index, iterations);
        case 'cache':
            return computeCacheEntry(index, iterations);
        case 'initialization':
            return computeSystemState(index, iterations);
        default:
            return computeLookupValue(index, iterations);
    }
}

function computeLookupValue(index, iterations) {
    // Compute mathematical lookup table entry
    let value = 0;

    for (let i = 0; i < iterations; i++) {
        value += Math.sin(index * 0.01 + i * 0.001);
        value += Math.cos(index * 0.02 + i * 0.002);
        value += Math.tan((index % 100) * 0.01) * 0.01;
    }

    return value / iterations;
}

function computeExpensiveResult(index, iterations) {
    // Simulate expensive function evaluation
    let result = {
        index,
        computed: 0,
        factors: []
    };

    // Find factors (expensive for large numbers)
    const num = index + 2;
    for (let i = 1; i <= Math.min(num, 100); i++) {
        if (num % i === 0) {
            result.factors.push(i);
        }
    }

    // Additional computation
    for (let i = 0; i < iterations; i++) {
        result.computed += Math.pow(index % 100, 2) / (i + 1);
    }

    return result;
}

function computeCacheEntry(index, iterations) {
    // Simulate cache entry computation
    const data = {
        key: `item_${index}`,
        value: 0,
        metadata: {
            createdAt: Date.now(),
            index
        }
    };

    // Compute value with work simulation
    for (let i = 0; i < iterations; i++) {
        data.value += Math.random() * Math.sin(index + i);
    }

    data.value = data.value / iterations;
    data.checksum = computeChecksum(data.key + data.value);

    return data;
}

function computeChecksum(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function computeSystemState(index, iterations) {
    // Simulate system initialization state
    const state = {
        componentId: index,
        status: 'initialized',
        config: {},
        connections: []
    };

    // Generate config
    for (let i = 0; i < 5; i++) {
        state.config[`param_${i}`] = Math.random() * 100;
    }

    // Compute connections (work simulation)
    for (let i = 0; i < iterations; i++) {
        if (i % 100 === 0) {
            state.connections.push({
                target: (index + i) % 1000,
                weight: Math.random()
            });
        }
    }

    return state;
}

function runLazyAccess(config) {
    const { scenario, accessIndices, complexity } = config;

    const cache = new Map();
    let cacheHits = 0;
    let computations = 0;

    const iterations = complexity === 'low' ? 100 :
                      complexity === 'medium' ? 500 :
                      complexity === 'high' ? 2000 : 500;

    // Lazy evaluation: compute only when accessed
    accessIndices.forEach(index => {
        if (cache.has(index)) {
            // Cache hit
            const value = cache.get(index);
            cacheHits++;
        } else {
            // Cache miss - compute now
            const value = computeValue(scenario, index, complexity);
            cache.set(index, value);
            computations++;
        }
    });

    self.postMessage({
        type: 'lazy_complete',
        accessCount: accessIndices.length,
        computations,
        cacheHits
    });
}
