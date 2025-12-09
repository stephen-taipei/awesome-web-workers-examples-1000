/**
 * Web Worker: Median Calculator
 *
 * Calculates median for large datasets using various algorithms
 * including QuickSelect for O(n) average complexity.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'median':
                result = calculateMedian(data);
                break;
            case 'medianAbsoluteDeviation':
                result = calculateMAD(data);
                break;
            case 'runningMedian':
                result = calculateRunningMedian(data, e.data.windowSize || 10);
                break;
            case 'weightedMedian':
                result = calculateWeightedMedian(data, e.data.weights);
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
 * Partition function for QuickSelect
 */
function partition(arr, left, right, pivotIndex) {
    const pivotValue = arr[pivotIndex];
    // Move pivot to end
    [arr[pivotIndex], arr[right]] = [arr[right], arr[pivotIndex]];

    let storeIndex = left;
    for (let i = left; i < right; i++) {
        if (arr[i] < pivotValue) {
            [arr[storeIndex], arr[i]] = [arr[i], arr[storeIndex]];
            storeIndex++;
        }
    }

    // Move pivot to final position
    [arr[right], arr[storeIndex]] = [arr[storeIndex], arr[right]];
    return storeIndex;
}

/**
 * QuickSelect algorithm - O(n) average time complexity
 */
function quickSelect(arr, left, right, k) {
    while (left < right) {
        // Choose pivot (median of three)
        const mid = Math.floor((left + right) / 2);
        if (arr[mid] < arr[left]) [arr[left], arr[mid]] = [arr[mid], arr[left]];
        if (arr[right] < arr[left]) [arr[left], arr[right]] = [arr[right], arr[left]];
        if (arr[mid] < arr[right]) [arr[mid], arr[right]] = [arr[right], arr[mid]];

        const pivotIndex = partition(arr, left, right, right);

        if (k === pivotIndex) {
            return arr[k];
        } else if (k < pivotIndex) {
            right = pivotIndex - 1;
        } else {
            left = pivotIndex + 1;
        }
    }

    return arr[left];
}

/**
 * Calculate median using QuickSelect
 */
function calculateMedian(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    // Copy array to avoid modifying original
    const arr = [...data];

    self.postMessage({ type: 'progress', current: 0, total: 100, percentage: 0 });

    let median;
    if (n % 2 === 1) {
        // Odd length - single middle element
        const k = Math.floor(n / 2);
        median = quickSelect(arr, 0, n - 1, k);
    } else {
        // Even length - average of two middle elements
        const k1 = n / 2 - 1;
        const k2 = n / 2;
        const v1 = quickSelect(arr, 0, n - 1, k1);
        const v2 = quickSelect(arr, 0, n - 1, k2);
        median = (v1 + v2) / 2;
    }

    self.postMessage({ type: 'progress', current: 50, total: 100, percentage: 50 });

    // Calculate additional statistics (requires sorting)
    arr.sort((a, b) => a - b);

    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    const q1 = arr[q1Index];
    const q3 = arr[q3Index];
    const iqr = q3 - q1;

    // Calculate mean for comparison
    let sum = 0;
    for (const x of arr) sum += x;
    const mean = sum / n;

    self.postMessage({ type: 'progress', current: 100, total: 100, percentage: 100 });

    return {
        median,
        count: n,
        min: arr[0],
        max: arr[n - 1],
        range: arr[n - 1] - arr[0],
        q1,
        q3,
        iqr,
        mean,
        medianVsMean: median - mean,
        skewIndicator: median < mean ? 'Right-skewed' : (median > mean ? 'Left-skewed' : 'Symmetric')
    };
}

/**
 * Median Absolute Deviation (MAD)
 * Robust measure of variability
 */
function calculateMAD(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    // First calculate median
    const arr = [...data];
    const median = n % 2 === 1
        ? quickSelect(arr, 0, n - 1, Math.floor(n / 2))
        : (quickSelect(arr, 0, n - 1, n / 2 - 1) + quickSelect(arr, 0, n - 1, n / 2)) / 2;

    self.postMessage({ type: 'progress', current: 33, total: 100, percentage: 33 });

    // Calculate absolute deviations from median
    const deviations = data.map(x => Math.abs(x - median));

    self.postMessage({ type: 'progress', current: 66, total: 100, percentage: 66 });

    // Calculate median of deviations
    const mad = deviations.length % 2 === 1
        ? quickSelect(deviations, 0, deviations.length - 1, Math.floor(deviations.length / 2))
        : (quickSelect(deviations, 0, deviations.length - 1, deviations.length / 2 - 1) +
           quickSelect(deviations, 0, deviations.length - 1, deviations.length / 2)) / 2;

    // Scale factor for normal distribution (1.4826)
    const scaledMAD = mad * 1.4826;

    self.postMessage({ type: 'progress', current: 100, total: 100, percentage: 100 });

    return {
        median,
        mad,
        scaledMAD,
        count: n,
        interpretation: 'MAD × 1.4826 estimates standard deviation for normal distributions'
    };
}

/**
 * Running Median (sliding window)
 */
function calculateRunningMedian(data, windowSize) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');
    if (windowSize > n) throw new Error('Window size larger than data');

    const results = [];

    for (let i = 0; i <= n - windowSize; i++) {
        const window = data.slice(i, i + windowSize);
        const windowCopy = [...window];

        let median;
        if (windowSize % 2 === 1) {
            median = quickSelect(windowCopy, 0, windowSize - 1, Math.floor(windowSize / 2));
        } else {
            const v1 = quickSelect(windowCopy, 0, windowSize - 1, windowSize / 2 - 1);
            const v2 = quickSelect(windowCopy, 0, windowSize - 1, windowSize / 2);
            median = (v1 + v2) / 2;
        }

        results.push({
            index: i,
            median,
            windowStart: i,
            windowEnd: i + windowSize - 1
        });

        if (i % 1000 === 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n - windowSize + 1,
                percentage: Math.floor((i / (n - windowSize + 1)) * 100)
            });
        }
    }

    // Calculate statistics on running medians
    const medians = results.map(r => r.median);
    medians.sort((a, b) => a - b);

    return {
        windowSize,
        count: results.length,
        runningMedians: results.slice(0, 100), // Limit output
        truncated: results.length > 100,
        medianOfMedians: medians[Math.floor(medians.length / 2)],
        minMedian: medians[0],
        maxMedian: medians[medians.length - 1]
    };
}

/**
 * Weighted Median
 */
function calculateWeightedMedian(data, weights) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');
    if (!weights || weights.length !== n) {
        throw new Error('Weights must match data length');
    }

    // Create array of {value, weight} and sort by value
    const items = data.map((v, i) => ({ value: v, weight: weights[i] }))
                      .sort((a, b) => a.value - b.value);

    // Calculate total weight
    let totalWeight = 0;
    for (const w of weights) {
        if (w < 0) throw new Error('Weights must be non-negative');
        totalWeight += w;
    }

    if (totalWeight === 0) throw new Error('Total weight is zero');

    // Find weighted median
    let cumulativeWeight = 0;
    const halfWeight = totalWeight / 2;

    for (let i = 0; i < n; i++) {
        cumulativeWeight += items[i].weight;

        if (cumulativeWeight >= halfWeight) {
            // Check if exactly at half
            if (cumulativeWeight === halfWeight && i + 1 < n) {
                return {
                    weightedMedian: (items[i].value + items[i + 1].value) / 2,
                    count: n,
                    totalWeight,
                    method: 'average of two middle values'
                };
            }

            return {
                weightedMedian: items[i].value,
                count: n,
                totalWeight,
                method: 'first value where cumulative weight >= half'
            };
        }

        if (i % 10000 === 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.floor((i / n) * 100)
            });
        }
    }

    // Fallback (shouldn't reach here)
    return {
        weightedMedian: items[n - 1].value,
        count: n,
        totalWeight
    };
}

/**
 * Generate random data and calculate median
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

            case 'bimodal':
                const mean1 = params?.mean1 ?? 30;
                const mean2 = params?.mean2 ?? 70;
                const std = params?.stdDev ?? 10;
                const u = Math.random();
                const v = Math.random();
                const z2 = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
                value = Math.random() < 0.5 ? mean1 + z2 * std : mean2 + z2 * std;
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

    // Calculate median and stats
    const result = calculateMedian(data);

    return {
        distribution,
        params,
        generated: count,
        ...result,
        sample: data.slice(0, 10).map(x => x.toFixed(4))
    };
}
