/**
 * Web Worker: Standard Deviation Calculator
 *
 * Calculates standard deviation using Welford's online algorithm
 * for numerical stability with large datasets.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'population':
                result = calculatePopulationStdDev(data);
                break;
            case 'sample':
                result = calculateSampleStdDev(data);
                break;
            case 'both':
                result = calculateBothStdDev(data);
                break;
            case 'grouped':
                result = calculateGroupedStdDev(e.data.values, e.data.frequencies);
                break;
            case 'pooled':
                result = calculatePooledStdDev(e.data.groups);
                break;
            case 'generate':
                result = generateAndCalculate(e.data.count, e.data.distribution, e.data.params);
                break;
            default:
                throw new Error('Unknown calculation type');
        }

        self.postMessage({
            type: 'result',
            calculationType: type,
            result,
            executionTime: (performance.now() - startTime).toFixed(2)
        });
    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};

/**
 * Welford's online algorithm for mean and variance
 * Numerically stable for large datasets
 */
function welfordOnline(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    let count = 0;
    let mean = 0;
    let M2 = 0;
    let min = data[0], max = data[0];

    for (let i = 0; i < n; i++) {
        const x = data[i];
        count++;

        const delta = x - mean;
        mean += delta / count;
        const delta2 = x - mean;
        M2 += delta * delta2;

        if (x < min) min = x;
        if (x > max) max = x;

        if (i % 1000000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.floor((i / n) * 100)
            });
        }
    }

    return {
        count,
        mean,
        M2,
        min,
        max,
        populationVariance: M2 / count,
        sampleVariance: count > 1 ? M2 / (count - 1) : 0
    };
}

/**
 * Calculate population standard deviation (σ)
 */
function calculatePopulationStdDev(data) {
    const stats = welfordOnline(data);
    const stdDev = Math.sqrt(stats.populationVariance);

    return {
        stdDev,
        variance: stats.populationVariance,
        mean: stats.mean,
        count: stats.count,
        min: stats.min,
        max: stats.max,
        range: stats.max - stats.min,
        coefficientOfVariation: stats.mean !== 0 ? (stdDev / Math.abs(stats.mean) * 100).toFixed(2) : 'N/A',
        type: 'Population (σ)',
        formula: 'σ = √(Σ(x-μ)² / N)'
    };
}

/**
 * Calculate sample standard deviation (s)
 */
function calculateSampleStdDev(data) {
    const stats = welfordOnline(data);

    if (stats.count < 2) {
        throw new Error('Sample standard deviation requires at least 2 data points');
    }

    const stdDev = Math.sqrt(stats.sampleVariance);

    return {
        stdDev,
        variance: stats.sampleVariance,
        mean: stats.mean,
        count: stats.count,
        min: stats.min,
        max: stats.max,
        range: stats.max - stats.min,
        coefficientOfVariation: stats.mean !== 0 ? (stdDev / Math.abs(stats.mean) * 100).toFixed(2) : 'N/A',
        standardError: stdDev / Math.sqrt(stats.count),
        type: 'Sample (s)',
        formula: 's = √(Σ(x-x̄)² / (n-1))'
    };
}

/**
 * Calculate both population and sample standard deviation
 */
function calculateBothStdDev(data) {
    const stats = welfordOnline(data);

    const popStdDev = Math.sqrt(stats.populationVariance);
    const sampleStdDev = stats.count > 1 ? Math.sqrt(stats.sampleVariance) : null;

    return {
        population: {
            stdDev: popStdDev,
            variance: stats.populationVariance,
            symbol: 'σ'
        },
        sample: stats.count > 1 ? {
            stdDev: sampleStdDev,
            variance: stats.sampleVariance,
            symbol: 's',
            standardError: sampleStdDev / Math.sqrt(stats.count)
        } : null,
        mean: stats.mean,
        count: stats.count,
        min: stats.min,
        max: stats.max,
        range: stats.max - stats.min,
        difference: stats.count > 1 ? Math.abs(sampleStdDev - popStdDev).toFixed(6) : 'N/A',
        besselCorrection: stats.count > 1 ? (stats.count / (stats.count - 1)).toFixed(6) : 'N/A'
    };
}

/**
 * Calculate standard deviation for grouped data
 */
function calculateGroupedStdDev(values, frequencies) {
    if (values.length !== frequencies.length) {
        throw new Error('Values and frequencies must have same length');
    }

    let n = 0;
    let sumFX = 0;
    let sumFX2 = 0;

    for (let i = 0; i < values.length; i++) {
        const f = frequencies[i];
        const x = values[i];
        n += f;
        sumFX += f * x;
        sumFX2 += f * x * x;
    }

    if (n === 0) throw new Error('Total frequency is zero');

    const mean = sumFX / n;
    const variance = (sumFX2 / n) - (mean * mean);
    const stdDev = Math.sqrt(variance);

    return {
        stdDev,
        variance,
        mean,
        totalFrequency: n,
        groups: values.length,
        type: 'Grouped Data',
        formula: 'σ = √(Σfx² / N - μ²)'
    };
}

/**
 * Calculate pooled standard deviation from multiple groups
 */
function calculatePooledStdDev(groups) {
    if (groups.length < 2) {
        throw new Error('Pooled std dev requires at least 2 groups');
    }

    let numerator = 0;
    let denominatorN = 0;
    const groupStats = [];

    for (let g = 0; g < groups.length; g++) {
        const data = groups[g];
        const stats = welfordOnline(data);
        const n = stats.count;

        groupStats.push({
            group: g + 1,
            n: n,
            mean: stats.mean.toFixed(4),
            stdDev: Math.sqrt(stats.sampleVariance).toFixed(4),
            variance: stats.sampleVariance.toFixed(4)
        });

        numerator += (n - 1) * stats.sampleVariance;
        denominatorN += n - 1;

        self.postMessage({
            type: 'progress',
            current: g + 1,
            total: groups.length,
            percentage: Math.floor(((g + 1) / groups.length) * 100)
        });
    }

    const pooledVariance = numerator / denominatorN;
    const pooledStdDev = Math.sqrt(pooledVariance);

    return {
        pooledStdDev,
        pooledVariance,
        groupCount: groups.length,
        totalN: denominatorN + groups.length,
        degreesOfFreedom: denominatorN,
        groupStats,
        formula: 'sp = √(Σ(nᵢ-1)sᵢ² / Σ(nᵢ-1))'
    };
}

/**
 * Generate random data and calculate standard deviation
 */
function generateAndCalculate(count, distribution, params) {
    const data = [];

    for (let i = 0; i < count; i++) {
        let value;

        switch (distribution) {
            case 'uniform':
                const min = params?.min ?? 0;
                const max = params?.max ?? 100;
                value = min + Math.random() * (max - min);
                break;

            case 'normal':
                const mean = params?.mean ?? 50;
                const stdDev = params?.stdDev ?? 10;
                const u1 = Math.random();
                const u2 = Math.random();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                value = mean + z * stdDev;
                break;

            case 'exponential':
                const lambda = params?.lambda ?? 1;
                value = -Math.log(Math.random()) / lambda;
                break;

            case 'lognormal':
                const muLog = params?.mu ?? 0;
                const sigmaLog = params?.sigma ?? 1;
                const u = Math.random();
                const v = Math.random();
                const zLog = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
                value = Math.exp(muLog + sigmaLog * zLog);
                break;

            default:
                value = Math.random() * 100;
        }

        data.push(value);

        if (i % 100000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: count,
                percentage: Math.floor((i / count) * 50)
            });
        }
    }

    const result = calculateBothStdDev(data);

    return {
        distribution,
        params,
        generated: count,
        ...result,
        sample: data.slice(0, 10).map(x => x.toFixed(4))
    };
}
