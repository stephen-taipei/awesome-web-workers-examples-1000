/**
 * Web Worker: Mean Calculator
 *
 * Calculates various types of means for large datasets
 * with high precision using chunked processing.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'arithmetic':
                result = arithmeticMean(data);
                break;
            case 'geometric':
                result = geometricMean(data);
                break;
            case 'harmonic':
                result = harmonicMean(data);
                break;
            case 'weighted':
                result = weightedMean(data, e.data.weights);
                break;
            case 'trimmed':
                result = trimmedMean(data, e.data.trimPercent || 5);
                break;
            case 'all':
                result = calculateAllMeans(data);
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
 * Kahan summation for better numerical precision
 */
function kahanSum(arr) {
    let sum = 0;
    let c = 0; // Compensation for lost low-order bits

    for (let i = 0; i < arr.length; i++) {
        const y = arr[i] - c;
        const t = sum + y;
        c = (t - sum) - y;
        sum = t;

        if (i % 1000000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: arr.length,
                percentage: Math.floor((i / arr.length) * 100)
            });
        }
    }

    return sum;
}

/**
 * Arithmetic Mean (average)
 */
function arithmeticMean(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    const sum = kahanSum(data);
    const mean = sum / n;

    // Calculate additional statistics
    let sumSqDiff = 0;
    let min = data[0], max = data[0];

    for (const x of data) {
        sumSqDiff += (x - mean) ** 2;
        if (x < min) min = x;
        if (x > max) max = x;
    }

    const variance = sumSqDiff / n;
    const stdDev = Math.sqrt(variance);

    return {
        mean,
        sum,
        count: n,
        min,
        max,
        range: max - min,
        variance,
        stdDev,
        standardError: stdDev / Math.sqrt(n)
    };
}

/**
 * Geometric Mean
 * Used for growth rates, ratios
 */
function geometricMean(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    // Check for non-positive values
    for (const x of data) {
        if (x <= 0) {
            throw new Error('Geometric mean requires all positive values');
        }
    }

    // Use log to avoid overflow
    let logSum = 0;
    for (let i = 0; i < n; i++) {
        logSum += Math.log(data[i]);

        if (i % 1000000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.floor((i / n) * 100)
            });
        }
    }

    const geoMean = Math.exp(logSum / n);

    return {
        geometricMean: geoMean,
        logMean: logSum / n,
        count: n,
        product: n <= 20 ? data.reduce((a, b) => a * b, 1) : 'Too large'
    };
}

/**
 * Harmonic Mean
 * Used for rates, speeds
 */
function harmonicMean(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    let reciprocalSum = 0;
    let zeroCount = 0;

    for (let i = 0; i < n; i++) {
        if (data[i] === 0) {
            zeroCount++;
        } else {
            reciprocalSum += 1 / data[i];
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

    if (zeroCount > 0) {
        return {
            harmonicMean: 0,
            count: n,
            zeroCount,
            note: 'Contains zeros, harmonic mean is 0'
        };
    }

    return {
        harmonicMean: n / reciprocalSum,
        reciprocalSum,
        count: n
    };
}

/**
 * Weighted Mean
 */
function weightedMean(data, weights) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');
    if (!weights || weights.length !== n) {
        throw new Error('Weights must match data length');
    }

    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < n; i++) {
        weightedSum += data[i] * weights[i];
        totalWeight += weights[i];

        if (i % 1000000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.floor((i / n) * 100)
            });
        }
    }

    if (totalWeight === 0) throw new Error('Total weight is zero');

    return {
        weightedMean: weightedSum / totalWeight,
        weightedSum,
        totalWeight,
        count: n
    };
}

/**
 * Trimmed Mean (removes outliers)
 */
function trimmedMean(data, trimPercent) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    // Sort data
    const sorted = [...data].sort((a, b) => a - b);

    // Calculate trim count
    const trimCount = Math.floor(n * trimPercent / 100);
    const trimmedData = sorted.slice(trimCount, n - trimCount);

    if (trimmedData.length === 0) {
        throw new Error('Too much trimming, no data left');
    }

    const sum = kahanSum(trimmedData);
    const mean = sum / trimmedData.length;

    return {
        trimmedMean: mean,
        originalCount: n,
        trimmedCount: trimmedData.length,
        trimPercent,
        removedLow: trimCount,
        removedHigh: trimCount,
        lowestKept: trimmedData[0],
        highestKept: trimmedData[trimmedData.length - 1]
    };
}

/**
 * Calculate all types of means
 */
function calculateAllMeans(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    self.postMessage({ type: 'progress', current: 0, total: 5, percentage: 0 });

    // Arithmetic
    const arithmetic = arithmeticMean(data);
    self.postMessage({ type: 'progress', current: 1, total: 5, percentage: 20 });

    // Geometric (if all positive)
    let geometric = null;
    const allPositive = data.every(x => x > 0);
    if (allPositive) {
        geometric = geometricMean(data);
    }
    self.postMessage({ type: 'progress', current: 2, total: 5, percentage: 40 });

    // Harmonic (if no zeros)
    let harmonic = null;
    const hasZeros = data.some(x => x === 0);
    const allNonNegative = data.every(x => x >= 0);
    if (!hasZeros && allNonNegative) {
        harmonic = harmonicMean(data);
    }
    self.postMessage({ type: 'progress', current: 3, total: 5, percentage: 60 });

    // Quadratic mean (RMS)
    let sumSquares = 0;
    for (const x of data) {
        sumSquares += x * x;
    }
    const quadratic = Math.sqrt(sumSquares / n);
    self.postMessage({ type: 'progress', current: 4, total: 5, percentage: 80 });

    // Trimmed mean (5%)
    const trimmed = trimmedMean(data, 5);
    self.postMessage({ type: 'progress', current: 5, total: 5, percentage: 100 });

    return {
        count: n,
        arithmetic: arithmetic.mean,
        geometric: geometric ? geometric.geometricMean : null,
        harmonic: harmonic ? harmonic.harmonicMean : null,
        quadratic,
        trimmed5: trimmed.trimmedMean,
        min: arithmetic.min,
        max: arithmetic.max,
        range: arithmetic.range,
        stdDev: arithmetic.stdDev,
        inequality: allPositive ? 'AM ≥ GM ≥ HM' : 'N/A (requires positive values)'
    };
}

/**
 * Generate random data and calculate
 */
function generateAndCalculate(count, distribution, params) {
    const data = [];

    self.postMessage({ type: 'progress', current: 0, total: count, percentage: 0 });

    for (let i = 0; i < count; i++) {
        let value;

        switch (distribution) {
            case 'uniform':
                const min = params?.min ?? 0;
                const max = params?.max ?? 100;
                value = min + Math.random() * (max - min);
                break;

            case 'normal':
                // Box-Muller transform
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

            case 'poisson':
                const lambdaP = params?.lambda ?? 5;
                let L = Math.exp(-lambdaP);
                let k = 0;
                let p = 1;
                do {
                    k++;
                    p *= Math.random();
                } while (p > L);
                value = k - 1;
                break;

            default:
                value = Math.random() * 100;
        }

        data.push(value);

        if (i % 100000 === 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: count,
                percentage: Math.floor((i / count) * 50)
            });
        }
    }

    // Calculate all means
    const results = calculateAllMeans(data);

    return {
        distribution,
        params,
        generated: count,
        ...results,
        sample: data.slice(0, 10).map(x => x.toFixed(4))
    };
}
