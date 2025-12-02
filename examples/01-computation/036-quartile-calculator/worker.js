/**
 * Web Worker: Quartile Calculator
 *
 * Calculates Q1, Q2 (median), Q3 and related statistics
 * using efficient selection algorithms.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'quartiles':
                result = calculateQuartiles(data);
                break;
            case 'iqr':
                result = calculateIQR(data);
                break;
            case 'boxplot':
                result = calculateBoxPlot(data);
                break;
            case 'fiveNumber':
                result = calculateFiveNumberSummary(data);
                break;
            case 'deciles':
                result = calculateDeciles(data);
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
 * QuickSelect algorithm for O(n) selection
 */
function quickSelect(arr, k) {
    if (arr.length === 1) return arr[0];

    const pivot = arr[Math.floor(Math.random() * arr.length)];
    const lows = [];
    const highs = [];
    const pivots = [];

    for (const x of arr) {
        if (x < pivot) lows.push(x);
        else if (x > pivot) highs.push(x);
        else pivots.push(x);
    }

    if (k < lows.length) {
        return quickSelect(lows, k);
    } else if (k < lows.length + pivots.length) {
        return pivot;
    } else {
        return quickSelect(highs, k - lows.length - pivots.length);
    }
}

/**
 * Calculate quartile value using linear interpolation
 */
function getQuartileValue(sortedData, quartile) {
    const n = sortedData.length;
    const pos = (n - 1) * quartile;
    const base = Math.floor(pos);
    const rest = pos - base;

    if (base + 1 < n) {
        return sortedData[base] + rest * (sortedData[base + 1] - sortedData[base]);
    } else {
        return sortedData[base];
    }
}

/**
 * Calculate Q1, Q2, Q3
 */
function calculateQuartiles(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    // Create sorted copy
    const sorted = [...data].sort((a, b) => a - b);

    // Report progress for large datasets
    if (n > 100000) {
        self.postMessage({ type: 'progress', percentage: 50 });
    }

    const Q1 = getQuartileValue(sorted, 0.25);
    const Q2 = getQuartileValue(sorted, 0.50);
    const Q3 = getQuartileValue(sorted, 0.75);

    // Calculate mean
    let sum = 0;
    for (const x of data) sum += x;
    const mean = sum / n;

    return {
        Q1,
        Q2,
        Q3,
        mean,
        count: n,
        min: sorted[0],
        max: sorted[n - 1],
        IQR: Q3 - Q1,
        range: sorted[n - 1] - sorted[0],
        quartileSkewness: ((Q3 - Q2) - (Q2 - Q1)) / (Q3 - Q1)
    };
}

/**
 * Calculate IQR with outlier detection
 */
function calculateIQR(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    const sorted = [...data].sort((a, b) => a - b);

    const Q1 = getQuartileValue(sorted, 0.25);
    const Q3 = getQuartileValue(sorted, 0.75);
    const IQR = Q3 - Q1;

    const lowerFence = Q1 - 1.5 * IQR;
    const upperFence = Q3 + 1.5 * IQR;
    const extremeLowerFence = Q1 - 3 * IQR;
    const extremeUpperFence = Q3 + 3 * IQR;

    // Count outliers
    let mildOutliers = 0;
    let extremeOutliers = 0;
    const outlierValues = [];

    for (const x of sorted) {
        if (x < extremeLowerFence || x > extremeUpperFence) {
            extremeOutliers++;
            if (outlierValues.length < 20) outlierValues.push({ value: x, type: 'extreme' });
        } else if (x < lowerFence || x > upperFence) {
            mildOutliers++;
            if (outlierValues.length < 20) outlierValues.push({ value: x, type: 'mild' });
        }
    }

    return {
        Q1,
        Q3,
        IQR,
        lowerFence,
        upperFence,
        extremeLowerFence,
        extremeUpperFence,
        mildOutliers,
        extremeOutliers,
        totalOutliers: mildOutliers + extremeOutliers,
        outlierPercentage: ((mildOutliers + extremeOutliers) / n * 100).toFixed(2),
        outlierValues,
        count: n
    };
}

/**
 * Calculate box plot statistics
 */
function calculateBoxPlot(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    const sorted = [...data].sort((a, b) => a - b);

    self.postMessage({ type: 'progress', percentage: 30 });

    const Q1 = getQuartileValue(sorted, 0.25);
    const Q2 = getQuartileValue(sorted, 0.50);
    const Q3 = getQuartileValue(sorted, 0.75);
    const IQR = Q3 - Q1;

    const lowerFence = Q1 - 1.5 * IQR;
    const upperFence = Q3 + 1.5 * IQR;

    // Find whisker ends (adjacent values)
    let lowerWhisker = sorted[0];
    let upperWhisker = sorted[n - 1];

    for (const x of sorted) {
        if (x >= lowerFence) {
            lowerWhisker = x;
            break;
        }
    }

    for (let i = n - 1; i >= 0; i--) {
        if (sorted[i] <= upperFence) {
            upperWhisker = sorted[i];
            break;
        }
    }

    self.postMessage({ type: 'progress', percentage: 70 });

    // Collect outliers
    const outliers = [];
    for (const x of sorted) {
        if (x < lowerFence || x > upperFence) {
            outliers.push(x);
        }
    }

    // Calculate mean for notched box plot
    let sum = 0;
    for (const x of data) sum += x;
    const mean = sum / n;

    // Calculate notch (95% CI for median)
    const notchWidth = 1.57 * IQR / Math.sqrt(n);

    return {
        min: sorted[0],
        Q1,
        Q2,
        Q3,
        max: sorted[n - 1],
        IQR,
        lowerWhisker,
        upperWhisker,
        lowerFence,
        upperFence,
        outliers: outliers.slice(0, 50),
        outlierCount: outliers.length,
        mean,
        notchLower: Q2 - notchWidth,
        notchUpper: Q2 + notchWidth,
        count: n
    };
}

/**
 * Calculate five-number summary
 */
function calculateFiveNumberSummary(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    const sorted = [...data].sort((a, b) => a - b);

    const min = sorted[0];
    const Q1 = getQuartileValue(sorted, 0.25);
    const Q2 = getQuartileValue(sorted, 0.50);
    const Q3 = getQuartileValue(sorted, 0.75);
    const max = sorted[n - 1];

    // Calculate additional statistics
    let sum = 0, sumSq = 0;
    for (const x of data) {
        sum += x;
        sumSq += x * x;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    const stdDev = Math.sqrt(variance);

    return {
        fiveNumber: { min, Q1, Q2, Q3, max },
        IQR: Q3 - Q1,
        range: max - min,
        mean,
        stdDev,
        count: n,
        // Measures of spread
        semiIQR: (Q3 - Q1) / 2,
        midhinge: (Q1 + Q3) / 2,
        midrange: (min + max) / 2,
        trimean: (Q1 + 2 * Q2 + Q3) / 4
    };
}

/**
 * Calculate deciles (10th, 20th, ... 90th percentiles)
 */
function calculateDeciles(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    const sorted = [...data].sort((a, b) => a - b);
    const deciles = {};

    for (let i = 1; i <= 9; i++) {
        deciles[`D${i}`] = getQuartileValue(sorted, i / 10);

        if (i % 3 === 0) {
            self.postMessage({
                type: 'progress',
                percentage: Math.floor((i / 9) * 100)
            });
        }
    }

    // Calculate quintiles too
    const quintiles = {
        P20: getQuartileValue(sorted, 0.20),
        P40: getQuartileValue(sorted, 0.40),
        P60: getQuartileValue(sorted, 0.60),
        P80: getQuartileValue(sorted, 0.80)
    };

    return {
        deciles,
        quintiles,
        min: sorted[0],
        max: sorted[n - 1],
        median: deciles.D5,
        count: n
    };
}

/**
 * Generate random data and calculate quartiles
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

            case 'skewedRight':
                // Log-normal distribution
                const muLN = params?.mu ?? 3;
                const sigmaLN = params?.sigma ?? 0.5;
                const u = Math.random();
                const v = Math.random();
                const zLN = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
                value = Math.exp(muLN + sigmaLN * zLN);
                break;

            case 'skewedLeft':
                // Reflected exponential
                const lambdaL = params?.lambda ?? 0.05;
                value = 100 + Math.log(Math.random()) / lambdaL;
                break;

            case 'bimodal':
                // Mixture of two normals
                if (Math.random() < 0.5) {
                    const u1b = Math.random();
                    const u2b = Math.random();
                    const z1 = Math.sqrt(-2 * Math.log(u1b)) * Math.cos(2 * Math.PI * u2b);
                    value = 30 + z1 * 8;
                } else {
                    const u1b = Math.random();
                    const u2b = Math.random();
                    const z2 = Math.sqrt(-2 * Math.log(u1b)) * Math.cos(2 * Math.PI * u2b);
                    value = 70 + z2 * 8;
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

    const result = calculateBoxPlot(data);

    return {
        distribution,
        params,
        generated: count,
        ...result,
        sample: data.slice(0, 10).map(x => x.toFixed(4))
    };
}
