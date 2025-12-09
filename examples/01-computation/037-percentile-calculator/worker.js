/**
 * Web Worker: Percentile Calculator
 *
 * Calculates any percentile using various interpolation methods
 * for large datasets.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'single':
                result = calculateSinglePercentile(data, e.data.percentile, e.data.method);
                break;
            case 'multiple':
                result = calculateMultiplePercentiles(data, e.data.percentiles, e.data.method);
                break;
            case 'rank':
                result = calculatePercentileRank(data, e.data.value);
                break;
            case 'range':
                result = calculatePercentileRange(data, e.data.lower, e.data.upper);
                break;
            case 'all':
                result = calculateAllPercentiles(data);
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
 * Percentile calculation methods
 */
const METHODS = {
    // Method 1: Nearest rank (Excel PERCENTILE.INC)
    nearest: (sorted, p) => {
        const n = sorted.length;
        if (p === 0) return sorted[0];
        if (p === 1) return sorted[n - 1];
        const rank = p * (n - 1);
        const lower = Math.floor(rank);
        const upper = Math.ceil(rank);
        if (lower === upper) return sorted[lower];
        const frac = rank - lower;
        return sorted[lower] + frac * (sorted[upper] - sorted[lower]);
    },

    // Method 2: Linear interpolation (R type 7, default)
    linear: (sorted, p) => {
        const n = sorted.length;
        const h = (n - 1) * p;
        const hFloor = Math.floor(h);
        return sorted[hFloor] + (h - hFloor) * (sorted[Math.min(hFloor + 1, n - 1)] - sorted[hFloor]);
    },

    // Method 3: Lower (floor)
    lower: (sorted, p) => {
        const n = sorted.length;
        const index = Math.floor(p * (n - 1));
        return sorted[index];
    },

    // Method 4: Higher (ceil)
    higher: (sorted, p) => {
        const n = sorted.length;
        const index = Math.ceil(p * (n - 1));
        return sorted[Math.min(index, n - 1)];
    },

    // Method 5: Midpoint
    midpoint: (sorted, p) => {
        const n = sorted.length;
        const lower = Math.floor(p * (n - 1));
        const upper = Math.ceil(p * (n - 1));
        return (sorted[lower] + sorted[Math.min(upper, n - 1)]) / 2;
    },

    // Method 6: Exclusive (R type 6)
    exclusive: (sorted, p) => {
        const n = sorted.length;
        const h = (n + 1) * p - 1;
        if (h < 0) return sorted[0];
        if (h >= n - 1) return sorted[n - 1];
        const hFloor = Math.floor(h);
        return sorted[hFloor] + (h - hFloor) * (sorted[hFloor + 1] - sorted[hFloor]);
    },

    // Method 7: Inclusive (R type 5)
    inclusive: (sorted, p) => {
        const n = sorted.length;
        const h = n * p - 0.5;
        if (h < 0) return sorted[0];
        if (h >= n - 1) return sorted[n - 1];
        const hFloor = Math.floor(h);
        return sorted[hFloor] + (h - hFloor) * (sorted[hFloor + 1] - sorted[hFloor]);
    }
};

/**
 * Calculate a single percentile
 */
function calculateSinglePercentile(data, percentile, method = 'linear') {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');
    if (percentile < 0 || percentile > 100) throw new Error('Percentile must be 0-100');

    const sorted = [...data].sort((a, b) => a - b);
    const p = percentile / 100;

    self.postMessage({ type: 'progress', percentage: 50 });

    const methodFn = METHODS[method] || METHODS.linear;
    const value = methodFn(sorted, p);

    // Calculate additional statistics
    let sum = 0;
    for (const x of data) sum += x;
    const mean = sum / n;

    // Count values at or below the percentile
    let countBelow = 0;
    for (const x of sorted) {
        if (x <= value) countBelow++;
        else break;
    }

    return {
        percentile,
        value,
        method,
        count: n,
        mean,
        min: sorted[0],
        max: sorted[n - 1],
        countAtOrBelow: countBelow,
        actualPercentage: ((countBelow / n) * 100).toFixed(2)
    };
}

/**
 * Calculate multiple percentiles
 */
function calculateMultiplePercentiles(data, percentiles, method = 'linear') {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    const sorted = [...data].sort((a, b) => a - b);
    const methodFn = METHODS[method] || METHODS.linear;

    const results = [];
    for (let i = 0; i < percentiles.length; i++) {
        const percentile = percentiles[i];
        if (percentile < 0 || percentile > 100) continue;

        const p = percentile / 100;
        results.push({
            percentile,
            value: methodFn(sorted, p)
        });

        if (i % 10 === 0) {
            self.postMessage({
                type: 'progress',
                percentage: Math.floor((i / percentiles.length) * 100)
            });
        }
    }

    // Calculate mean
    let sum = 0;
    for (const x of data) sum += x;

    return {
        percentiles: results,
        method,
        count: n,
        mean: sum / n,
        min: sorted[0],
        max: sorted[n - 1]
    };
}

/**
 * Calculate percentile rank of a value
 */
function calculatePercentileRank(data, value) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    const sorted = [...data].sort((a, b) => a - b);

    self.postMessage({ type: 'progress', percentage: 50 });

    // Count values below and equal
    let below = 0;
    let equal = 0;

    for (const x of sorted) {
        if (x < value) below++;
        else if (x === value) equal++;
    }

    // Different methods for percentile rank
    const strictRank = (below / n) * 100;  // Strict: % below
    const weakRank = ((below + equal) / n) * 100;  // Weak: % at or below
    const meanRank = ((below + 0.5 * equal) / n) * 100;  // Mean of strict and weak

    return {
        value,
        percentileRank: {
            strict: strictRank.toFixed(2),
            weak: weakRank.toFixed(2),
            mean: meanRank.toFixed(2)
        },
        countBelow: below,
        countEqual: equal,
        countAbove: n - below - equal,
        count: n,
        min: sorted[0],
        max: sorted[n - 1],
        isInRange: value >= sorted[0] && value <= sorted[n - 1]
    };
}

/**
 * Calculate values in percentile range
 */
function calculatePercentileRange(data, lower, upper) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');
    if (lower >= upper) throw new Error('Lower must be less than upper');

    const sorted = [...data].sort((a, b) => a - b);
    const methodFn = METHODS.linear;

    const lowerValue = methodFn(sorted, lower / 100);
    const upperValue = methodFn(sorted, upper / 100);

    self.postMessage({ type: 'progress', percentage: 50 });

    // Filter values in range
    const inRange = [];
    for (const x of sorted) {
        if (x >= lowerValue && x <= upperValue) {
            inRange.push(x);
        }
    }

    // Calculate stats for values in range
    let sum = 0;
    for (const x of inRange) sum += x;
    const rangeMean = inRange.length > 0 ? sum / inRange.length : 0;

    return {
        lowerPercentile: lower,
        upperPercentile: upper,
        lowerValue,
        upperValue,
        range: upperValue - lowerValue,
        countInRange: inRange.length,
        percentageInRange: ((inRange.length / n) * 100).toFixed(2),
        rangeMean,
        rangeMedian: inRange.length > 0 ? inRange[Math.floor(inRange.length / 2)] : null,
        count: n,
        sample: inRange.slice(0, 20).map(x => x.toFixed(4))
    };
}

/**
 * Calculate all standard percentiles (1-99)
 */
function calculateAllPercentiles(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    const sorted = [...data].sort((a, b) => a - b);
    const methodFn = METHODS.linear;

    const percentiles = {};

    // Calculate 1st to 99th percentile
    for (let p = 1; p <= 99; p++) {
        percentiles[`P${p}`] = methodFn(sorted, p / 100);

        if (p % 20 === 0) {
            self.postMessage({
                type: 'progress',
                percentage: Math.floor((p / 99) * 100)
            });
        }
    }

    // Calculate summary stats
    let sum = 0, sumSq = 0;
    for (const x of data) {
        sum += x;
        sumSq += x * x;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;

    return {
        percentiles,
        keyPercentiles: {
            P1: percentiles.P1,
            P5: percentiles.P5,
            P10: percentiles.P10,
            P25: percentiles.P25,
            P50: percentiles.P50,
            P75: percentiles.P75,
            P90: percentiles.P90,
            P95: percentiles.P95,
            P99: percentiles.P99
        },
        count: n,
        mean,
        stdDev: Math.sqrt(variance),
        min: sorted[0],
        max: sorted[n - 1]
    };
}

/**
 * Generate random data and calculate percentiles
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
                const stdDev = params?.stdDev ?? 15;
                const u1 = Math.random();
                const u2 = Math.random();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                value = mean + z * stdDev;
                break;

            case 'exponential':
                const lambda = params?.lambda ?? 0.1;
                value = -Math.log(Math.random()) / lambda;
                break;

            case 'pareto':
                const alpha = params?.alpha ?? 2;
                const xm = params?.xm ?? 1;
                value = xm / Math.pow(Math.random(), 1 / alpha);
                break;

            case 'beta':
                // Approximation using normal
                const a = params?.a ?? 2;
                const b = params?.b ?? 5;
                // Simple beta approximation
                let sumBeta = 0;
                for (let j = 0; j < 12; j++) sumBeta += Math.random();
                value = (sumBeta - 6) / 6 * 0.2 + a / (a + b);
                value = Math.max(0, Math.min(1, value));
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

    const sorted = [...data].sort((a, b) => a - b);
    const methodFn = METHODS.linear;

    // Calculate key percentiles
    const keyPercentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99].map(p => ({
        percentile: p,
        value: methodFn(sorted, p / 100)
    }));

    // Calculate mean
    let sum = 0;
    for (const x of data) sum += x;

    return {
        distribution,
        params,
        generated: count,
        percentiles: keyPercentiles,
        mean: sum / count,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        sample: data.slice(0, 10).map(x => x.toFixed(4))
    };
}
