/**
 * Web Worker: Mode Calculator
 *
 * Calculates mode (most frequent value) for large datasets
 * using hash-based counting.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'mode':
                result = calculateMode(data);
                break;
            case 'multimode':
                result = calculateMultiMode(data);
                break;
            case 'frequency':
                result = calculateFrequency(data, e.data.topN || 10);
                break;
            case 'grouped':
                result = calculateGroupedMode(data, e.data.binWidth || 1);
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
 * Calculate single mode (most frequent value)
 */
function calculateMode(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    const counts = new Map();
    let maxCount = 0;
    let mode = data[0];

    for (let i = 0; i < n; i++) {
        const val = data[i];
        const count = (counts.get(val) || 0) + 1;
        counts.set(val, count);

        if (count > maxCount) {
            maxCount = count;
            mode = val;
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

    // Check if unimodal
    let modeCount = 0;
    for (const count of counts.values()) {
        if (count === maxCount) modeCount++;
    }

    // Calculate mean for comparison
    let sum = 0;
    for (const x of data) sum += x;
    const mean = sum / n;

    return {
        mode,
        frequency: maxCount,
        percentage: ((maxCount / n) * 100).toFixed(2),
        isUnimodal: modeCount === 1,
        modeCount,
        uniqueValues: counts.size,
        totalCount: n,
        mean: mean.toFixed(6)
    };
}

/**
 * Calculate all modes (for multimodal data)
 */
function calculateMultiMode(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    const counts = new Map();
    let maxCount = 0;

    for (let i = 0; i < n; i++) {
        const val = data[i];
        const count = (counts.get(val) || 0) + 1;
        counts.set(val, count);
        if (count > maxCount) maxCount = count;

        if (i % 1000000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.floor((i / n) * 100)
            });
        }
    }

    // Find all values with max count
    const modes = [];
    for (const [value, count] of counts) {
        if (count === maxCount) {
            modes.push({ value, count });
        }
    }

    // Sort modes by value
    modes.sort((a, b) => a.value - b.value);

    // Determine modality
    let modality;
    if (modes.length === 1) modality = 'Unimodal';
    else if (modes.length === 2) modality = 'Bimodal';
    else if (modes.length === 3) modality = 'Trimodal';
    else if (modes.length <= counts.size / 2) modality = 'Multimodal';
    else modality = 'No clear mode (uniform-like)';

    return {
        modes: modes.slice(0, 20),
        maxFrequency: maxCount,
        modeCount: modes.length,
        modality,
        uniqueValues: counts.size,
        totalCount: n,
        truncated: modes.length > 20
    };
}

/**
 * Calculate frequency distribution
 */
function calculateFrequency(data, topN) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    const counts = new Map();

    for (let i = 0; i < n; i++) {
        const val = data[i];
        counts.set(val, (counts.get(val) || 0) + 1);

        if (i % 1000000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.floor((i / n) * 100)
            });
        }
    }

    // Convert to array and sort by frequency
    const freq = Array.from(counts.entries())
        .map(([value, count]) => ({
            value,
            count,
            percentage: ((count / n) * 100).toFixed(2)
        }))
        .sort((a, b) => b.count - a.count);

    // Calculate entropy
    let entropy = 0;
    for (const { count } of freq) {
        const p = count / n;
        if (p > 0) entropy -= p * Math.log2(p);
    }

    return {
        topN: freq.slice(0, topN),
        bottomN: freq.slice(-Math.min(topN, freq.length)).reverse(),
        uniqueValues: counts.size,
        totalCount: n,
        entropy: entropy.toFixed(4),
        maxEntropy: Math.log2(counts.size).toFixed(4)
    };
}

/**
 * Calculate mode for grouped/continuous data
 */
function calculateGroupedMode(data, binWidth) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    // Find min and max
    let min = data[0], max = data[0];
    for (const x of data) {
        if (x < min) min = x;
        if (x > max) max = x;
    }

    // Create bins
    const binStart = Math.floor(min / binWidth) * binWidth;
    const bins = new Map();

    for (let i = 0; i < n; i++) {
        const binIndex = Math.floor((data[i] - binStart) / binWidth);
        bins.set(binIndex, (bins.get(binIndex) || 0) + 1);

        if (i % 1000000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.floor((i / n) * 100)
            });
        }
    }

    // Find modal bin
    let maxCount = 0;
    let modalBinIndex = 0;
    for (const [binIndex, count] of bins) {
        if (count > maxCount) {
            maxCount = count;
            modalBinIndex = binIndex;
        }
    }

    const modalBinStart = binStart + modalBinIndex * binWidth;
    const modalBinEnd = modalBinStart + binWidth;
    const modalBinCenter = modalBinStart + binWidth / 2;

    // Get bin distribution
    const binArray = Array.from(bins.entries())
        .map(([index, count]) => ({
            start: binStart + index * binWidth,
            end: binStart + (index + 1) * binWidth,
            count,
            percentage: ((count / n) * 100).toFixed(2)
        }))
        .sort((a, b) => a.start - b.start);

    return {
        modalClass: {
            start: modalBinStart,
            end: modalBinEnd,
            center: modalBinCenter,
            frequency: maxCount
        },
        binWidth,
        binCount: bins.size,
        distribution: binArray.slice(0, 20),
        totalCount: n,
        min,
        max,
        range: max - min
    };
}

/**
 * Generate random data and calculate mode
 */
function generateAndCalculate(count, distribution, params) {
    const data = [];

    for (let i = 0; i < count; i++) {
        let value;

        switch (distribution) {
            case 'uniform':
                const min = params?.min ?? 1;
                const max = params?.max ?? 10;
                value = Math.floor(Math.random() * (max - min + 1)) + min;
                break;

            case 'normal':
                const mean = params?.mean ?? 50;
                const stdDev = params?.stdDev ?? 10;
                const u1 = Math.random();
                const u2 = Math.random();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                value = Math.round(mean + z * stdDev);
                break;

            case 'poisson':
                const lambda = params?.lambda ?? 5;
                let L = Math.exp(-lambda);
                let k = 0;
                let p = 1;
                do {
                    k++;
                    p *= Math.random();
                } while (p > L);
                value = k - 1;
                break;

            case 'binomial':
                const n = params?.n ?? 10;
                const prob = params?.p ?? 0.5;
                value = 0;
                for (let j = 0; j < n; j++) {
                    if (Math.random() < prob) value++;
                }
                break;

            case 'geometric':
                const pGeom = params?.p ?? 0.3;
                value = Math.floor(Math.log(Math.random()) / Math.log(1 - pGeom)) + 1;
                break;

            default:
                value = Math.floor(Math.random() * 10) + 1;
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

    // Calculate mode
    const modeResult = calculateMode(data);
    const multiResult = calculateMultiMode(data);

    return {
        distribution,
        params,
        generated: count,
        mode: modeResult.mode,
        frequency: modeResult.frequency,
        percentage: modeResult.percentage,
        modality: multiResult.modality,
        modes: multiResult.modes.slice(0, 5),
        uniqueValues: modeResult.uniqueValues,
        mean: modeResult.mean,
        sample: data.slice(0, 20)
    };
}
