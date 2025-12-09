/**
 * Web Worker: Variance Calculator
 *
 * Calculates variance using online algorithms
 * for numerical stability with large datasets.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'population':
                result = calculatePopulationVariance(data);
                break;
            case 'sample':
                result = calculateSampleVariance(data);
                break;
            case 'both':
                result = calculateBothVariance(data);
                break;
            case 'components':
                result = calculateVarianceComponents(data);
                break;
            case 'betweenWithin':
                result = calculateBetweenWithinVariance(e.data.groups);
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
 * Two-pass algorithm for accurate variance calculation
 */
function twoPassVariance(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    // First pass: calculate mean
    let sum = 0;
    let min = data[0], max = data[0];

    for (let i = 0; i < n; i++) {
        sum += data[i];
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];

        if (i % 2000000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n * 2,
                percentage: Math.floor((i / (n * 2)) * 100)
            });
        }
    }

    const mean = sum / n;

    // Second pass: calculate sum of squared deviations
    let sumSquaredDev = 0;
    let sumDev = 0; // For correction

    for (let i = 0; i < n; i++) {
        const dev = data[i] - mean;
        sumDev += dev;
        sumSquaredDev += dev * dev;

        if (i % 2000000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                current: n + i,
                total: n * 2,
                percentage: Math.floor(((n + i) / (n * 2)) * 100)
            });
        }
    }

    // Apply correction for numerical stability
    sumSquaredDev -= (sumDev * sumDev) / n;

    return {
        count: n,
        sum,
        mean,
        min,
        max,
        sumSquaredDev,
        populationVariance: sumSquaredDev / n,
        sampleVariance: n > 1 ? sumSquaredDev / (n - 1) : 0
    };
}

/**
 * Calculate population variance (σ²)
 */
function calculatePopulationVariance(data) {
    const stats = twoPassVariance(data);

    return {
        variance: stats.populationVariance,
        stdDev: Math.sqrt(stats.populationVariance),
        mean: stats.mean,
        count: stats.count,
        sum: stats.sum,
        sumSquaredDev: stats.sumSquaredDev,
        min: stats.min,
        max: stats.max,
        range: stats.max - stats.min,
        type: 'Population (σ²)',
        formula: 'σ² = Σ(x-μ)² / N'
    };
}

/**
 * Calculate sample variance (s²)
 */
function calculateSampleVariance(data) {
    const stats = twoPassVariance(data);

    if (stats.count < 2) {
        throw new Error('Sample variance requires at least 2 data points');
    }

    return {
        variance: stats.sampleVariance,
        stdDev: Math.sqrt(stats.sampleVariance),
        mean: stats.mean,
        count: stats.count,
        degreesOfFreedom: stats.count - 1,
        sum: stats.sum,
        sumSquaredDev: stats.sumSquaredDev,
        min: stats.min,
        max: stats.max,
        range: stats.max - stats.min,
        type: 'Sample (s²)',
        formula: 's² = Σ(x-x̄)² / (n-1)',
        whyN1: 'Bessel\'s correction for unbiased estimation'
    };
}

/**
 * Calculate both population and sample variance
 */
function calculateBothVariance(data) {
    const stats = twoPassVariance(data);

    return {
        population: {
            variance: stats.populationVariance,
            stdDev: Math.sqrt(stats.populationVariance),
            symbol: 'σ²'
        },
        sample: stats.count > 1 ? {
            variance: stats.sampleVariance,
            stdDev: Math.sqrt(stats.sampleVariance),
            symbol: 's²',
            degreesOfFreedom: stats.count - 1
        } : null,
        mean: stats.mean,
        count: stats.count,
        sumSquaredDev: stats.sumSquaredDev,
        min: stats.min,
        max: stats.max,
        range: stats.max - stats.min,
        ratio: stats.count > 1 ? (stats.sampleVariance / stats.populationVariance).toFixed(6) : 'N/A',
        besselFactor: stats.count > 1 ? (stats.count / (stats.count - 1)).toFixed(6) : 'N/A'
    };
}

/**
 * Calculate variance components (SS breakdown)
 */
function calculateVarianceComponents(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    // Calculate mean
    let sum = 0;
    for (const x of data) sum += x;
    const mean = sum / n;

    // Calculate components
    let SS_total = 0;      // Sum of squares total
    let SS_explained = 0;   // Sum of squares explained (if linear)
    const deviations = [];

    for (let i = 0; i < n; i++) {
        const dev = data[i] - mean;
        const devSquared = dev * dev;
        SS_total += devSquared;

        if (i < 20) {
            deviations.push({
                value: data[i].toFixed(4),
                deviation: dev.toFixed(4),
                deviationSquared: devSquared.toFixed(4)
            });
        }

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
        sumOfSquares: SS_total,
        populationVariance: SS_total / n,
        sampleVariance: n > 1 ? SS_total / (n - 1) : 0,
        mean,
        count: n,
        meanSquare: SS_total / n,
        rootMeanSquare: Math.sqrt(SS_total / n),
        deviations: deviations,
        truncated: n > 20
    };
}

/**
 * Calculate between-group and within-group variance
 */
function calculateBetweenWithinVariance(groups) {
    if (groups.length < 2) {
        throw new Error('Need at least 2 groups');
    }

    const groupStats = [];
    let grandSum = 0;
    let grandN = 0;

    // Calculate group means
    for (let g = 0; g < groups.length; g++) {
        const data = groups[g];
        let sum = 0;
        for (const x of data) sum += x;
        const mean = sum / data.length;

        groupStats.push({
            group: g + 1,
            n: data.length,
            sum,
            mean
        });

        grandSum += sum;
        grandN += data.length;
    }

    const grandMean = grandSum / grandN;

    // Calculate SS_between and SS_within
    let SS_between = 0;
    let SS_within = 0;

    for (let g = 0; g < groups.length; g++) {
        const groupMean = groupStats[g].mean;
        const n = groupStats[g].n;

        // Between-group: n * (group mean - grand mean)²
        SS_between += n * Math.pow(groupMean - grandMean, 2);

        // Within-group: sum of (x - group mean)²
        for (const x of groups[g]) {
            SS_within += Math.pow(x - groupMean, 2);
        }

        self.postMessage({
            type: 'progress',
            current: g + 1,
            total: groups.length,
            percentage: Math.floor(((g + 1) / groups.length) * 100)
        });
    }

    const SS_total = SS_between + SS_within;
    const df_between = groups.length - 1;
    const df_within = grandN - groups.length;

    const MS_between = SS_between / df_between;
    const MS_within = SS_within / df_within;
    const F_ratio = MS_between / MS_within;

    // Intraclass correlation
    const ICC = (MS_between - MS_within) / (MS_between + (grandN / groups.length - 1) * MS_within);

    return {
        grandMean,
        totalN: grandN,
        groupCount: groups.length,
        SS_between,
        SS_within,
        SS_total,
        df_between,
        df_within,
        MS_between,
        MS_within,
        F_ratio,
        ICC: Math.max(0, ICC).toFixed(4),
        varianceExplained: ((SS_between / SS_total) * 100).toFixed(2),
        groupStats: groupStats.map(g => ({
            ...g,
            mean: g.mean.toFixed(4)
        }))
    };
}

/**
 * Generate random data and calculate variance
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

            case 'chi-squared':
                const df = params?.df ?? 5;
                value = 0;
                for (let j = 0; j < df; j++) {
                    const u = Math.random();
                    const v = Math.random();
                    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
                    value += z * z;
                }
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

    const result = calculateBothVariance(data);

    // Theoretical variance for comparison
    let theoreticalVariance = null;
    if (distribution === 'uniform') {
        const a = params?.min ?? 0;
        const b = params?.max ?? 100;
        theoreticalVariance = Math.pow(b - a, 2) / 12;
    } else if (distribution === 'normal') {
        theoreticalVariance = Math.pow(params?.stdDev ?? 10, 2);
    } else if (distribution === 'exponential') {
        theoreticalVariance = 1 / Math.pow(params?.lambda ?? 1, 2);
    }

    return {
        distribution,
        params,
        generated: count,
        ...result,
        theoreticalVariance,
        sample: data.slice(0, 10).map(x => x.toFixed(4))
    };
}
