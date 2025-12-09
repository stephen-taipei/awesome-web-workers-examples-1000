/**
 * Web Worker: Skewness Calculator
 *
 * Calculates distribution skewness using various methods
 * (Fisher-Pearson, adjusted, Bowley, etc.)
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'fisher':
                result = calculateFisherSkewness(data);
                break;
            case 'adjusted':
                result = calculateAdjustedSkewness(data);
                break;
            case 'pearson':
                result = calculatePearsonSkewness(data);
                break;
            case 'bowley':
                result = calculateBowleySkewness(data);
                break;
            case 'all':
                result = calculateAllSkewness(data);
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
 * Calculate basic statistics needed for skewness
 */
function calculateBasicStats(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    // Calculate mean
    let sum = 0;
    let min = data[0], max = data[0];

    for (let i = 0; i < n; i++) {
        sum += data[i];
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];

        if (i % 2000000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                percentage: Math.floor((i / n) * 30)
            });
        }
    }

    const mean = sum / n;

    // Calculate moments
    let m2 = 0, m3 = 0, m4 = 0;

    for (let i = 0; i < n; i++) {
        const dev = data[i] - mean;
        const dev2 = dev * dev;
        m2 += dev2;
        m3 += dev2 * dev;
        m4 += dev2 * dev2;

        if (i % 2000000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                percentage: 30 + Math.floor((i / n) * 40)
            });
        }
    }

    // Population moments
    const variance = m2 / n;
    const stdDev = Math.sqrt(variance);

    return {
        n,
        mean,
        sum,
        min,
        max,
        range: max - min,
        m2,
        m3,
        m4,
        variance,
        stdDev,
        sampleVariance: n > 1 ? m2 / (n - 1) : 0,
        sampleStdDev: n > 1 ? Math.sqrt(m2 / (n - 1)) : 0
    };
}

/**
 * Calculate quartiles for Bowley skewness
 */
function calculateQuartiles(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;

    const getQuartile = (p) => {
        const pos = (n - 1) * p;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (base + 1 < n) {
            return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        }
        return sorted[base];
    };

    return {
        Q1: getQuartile(0.25),
        Q2: getQuartile(0.50),
        Q3: getQuartile(0.75),
        P10: getQuartile(0.10),
        P90: getQuartile(0.90)
    };
}

/**
 * Fisher-Pearson coefficient of skewness (g1)
 * Population version
 */
function calculateFisherSkewness(data) {
    const stats = calculateBasicStats(data);

    if (stats.stdDev === 0) {
        return {
            skewness: 0,
            interpretation: 'No variation in data',
            ...stats
        };
    }

    // g1 = m3 / m2^(3/2) where m2 and m3 are central moments
    const g1 = (stats.m3 / stats.n) / Math.pow(stats.variance, 1.5);

    return {
        skewness: g1,
        type: 'Fisher-Pearson (g1)',
        formula: 'g1 = m3 / σ³',
        interpretation: interpretSkewness(g1),
        direction: g1 > 0 ? 'Right (positive)' : g1 < 0 ? 'Left (negative)' : 'Symmetric',
        ...stats
    };
}

/**
 * Adjusted Fisher-Pearson standardized moment coefficient (G1)
 * Sample version with bias correction
 */
function calculateAdjustedSkewness(data) {
    const stats = calculateBasicStats(data);
    const n = stats.n;

    if (n < 3) throw new Error('Need at least 3 data points for adjusted skewness');
    if (stats.sampleStdDev === 0) {
        return {
            skewness: 0,
            interpretation: 'No variation in data',
            ...stats
        };
    }

    // g1 (unadjusted)
    const g1 = (stats.m3 / n) / Math.pow(stats.variance, 1.5);

    // G1 = g1 * sqrt(n*(n-1)) / (n-2)
    const G1 = g1 * Math.sqrt(n * (n - 1)) / (n - 2);

    // Standard error of skewness
    const SES = Math.sqrt((6 * n * (n - 1)) / ((n - 2) * (n + 1) * (n + 3)));

    // Z-score for significance test
    const zScore = G1 / SES;

    return {
        skewness: G1,
        unadjustedSkewness: g1,
        type: 'Adjusted Fisher-Pearson (G1)',
        formula: 'G1 = g1 × √(n(n-1)) / (n-2)',
        interpretation: interpretSkewness(G1),
        direction: G1 > 0 ? 'Right (positive)' : G1 < 0 ? 'Left (negative)' : 'Symmetric',
        standardError: SES,
        zScore,
        significantAt005: Math.abs(zScore) > 1.96,
        ...stats
    };
}

/**
 * Pearson's first coefficient of skewness (mode-based)
 * Pearson's second coefficient (median-based)
 */
function calculatePearsonSkewness(data) {
    const stats = calculateBasicStats(data);

    if (stats.stdDev === 0) {
        return {
            skewness: 0,
            interpretation: 'No variation in data',
            ...stats
        };
    }

    self.postMessage({ type: 'progress', percentage: 70 });

    // Calculate median
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    // Pearson's second coefficient: 3(mean - median) / stdDev
    const pearson2 = 3 * (stats.mean - median) / stats.stdDev;

    // Estimate mode using mean, median relationship
    // Mode ≈ 3*median - 2*mean (empirical rule for unimodal)
    const estimatedMode = 3 * median - 2 * stats.mean;

    // Pearson's first coefficient: (mean - mode) / stdDev
    const pearson1 = (stats.mean - estimatedMode) / stats.stdDev;

    return {
        pearsonFirst: pearson1,
        pearsonSecond: pearson2,
        type: "Pearson's Coefficients",
        formulaFirst: 'Sk1 = (mean - mode) / σ',
        formulaSecond: 'Sk2 = 3(mean - median) / σ',
        median,
        estimatedMode,
        interpretation: interpretSkewness(pearson2),
        direction: pearson2 > 0 ? 'Right (positive)' : pearson2 < 0 ? 'Left (negative)' : 'Symmetric',
        ...stats
    };
}

/**
 * Bowley's quartile skewness (Yule-Kendall index)
 */
function calculateBowleySkewness(data) {
    const stats = calculateBasicStats(data);

    self.postMessage({ type: 'progress', percentage: 70 });

    const quartiles = calculateQuartiles(data);
    const { Q1, Q2, Q3, P10, P90 } = quartiles;

    // Bowley skewness: (Q3 + Q1 - 2*Q2) / (Q3 - Q1)
    const IQR = Q3 - Q1;
    const bowley = IQR !== 0 ? (Q3 + Q1 - 2 * Q2) / IQR : 0;

    // Kelly's measure (using P10 and P90)
    const kellyDenom = P90 - P10;
    const kelly = kellyDenom !== 0 ? (P90 + P10 - 2 * Q2) / kellyDenom : 0;

    return {
        bowleySkewness: bowley,
        kellySkewness: kelly,
        type: "Bowley's Quartile Skewness",
        formula: 'Sk = (Q3 + Q1 - 2Q2) / (Q3 - Q1)',
        Q1,
        Q2,
        Q3,
        IQR,
        interpretation: interpretBowleySkewness(bowley),
        direction: bowley > 0 ? 'Right (positive)' : bowley < 0 ? 'Left (negative)' : 'Symmetric',
        P10,
        P90,
        ...stats
    };
}

/**
 * Calculate all skewness measures
 */
function calculateAllSkewness(data) {
    const stats = calculateBasicStats(data);

    if (stats.n < 3) throw new Error('Need at least 3 data points');

    self.postMessage({ type: 'progress', percentage: 50 });

    const n = stats.n;

    // Fisher-Pearson g1
    const g1 = stats.stdDev !== 0
        ? (stats.m3 / n) / Math.pow(stats.variance, 1.5)
        : 0;

    // Adjusted G1
    const G1 = g1 * Math.sqrt(n * (n - 1)) / (n - 2);

    // Quartiles for Bowley
    const sorted = [...data].sort((a, b) => a - b);
    const getQuartile = (p) => {
        const pos = (n - 1) * p;
        const base = Math.floor(pos);
        const rest = pos - base;
        return base + 1 < n
            ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
            : sorted[base];
    };

    const Q1 = getQuartile(0.25);
    const Q2 = getQuartile(0.50);
    const Q3 = getQuartile(0.75);
    const IQR = Q3 - Q1;

    // Bowley
    const bowley = IQR !== 0 ? (Q3 + Q1 - 2 * Q2) / IQR : 0;

    // Pearson's second
    const pearson2 = stats.stdDev !== 0 ? 3 * (stats.mean - Q2) / stats.stdDev : 0;

    // Kurtosis (for context)
    const kurtosis = stats.variance !== 0
        ? (stats.m4 / n) / Math.pow(stats.variance, 2) - 3
        : 0;

    // Standard error
    const SES = Math.sqrt((6 * n * (n - 1)) / ((n - 2) * (n + 1) * (n + 3)));

    self.postMessage({ type: 'progress', percentage: 90 });

    return {
        fisherPearson: {
            g1,
            G1,
            standardError: SES,
            zScore: G1 / SES
        },
        bowley,
        pearsonSecond: pearson2,
        excessKurtosis: kurtosis,
        quartiles: { Q1, Q2, Q3, IQR },
        interpretation: interpretSkewness(G1),
        distributionShape: describeShape(G1, kurtosis),
        ...stats
    };
}

/**
 * Interpret skewness value
 */
function interpretSkewness(sk) {
    const abs = Math.abs(sk);
    if (abs < 0.5) return 'Approximately symmetric';
    if (abs < 1) return 'Moderately skewed';
    return 'Highly skewed';
}

/**
 * Interpret Bowley skewness
 */
function interpretBowleySkewness(sk) {
    const abs = Math.abs(sk);
    if (abs < 0.1) return 'Approximately symmetric';
    if (abs < 0.3) return 'Moderately skewed';
    return 'Highly skewed';
}

/**
 * Describe distribution shape
 */
function describeShape(skewness, kurtosis) {
    let shape = '';

    // Skewness description
    if (Math.abs(skewness) < 0.5) {
        shape = 'Symmetric';
    } else if (skewness > 0) {
        shape = 'Right-skewed (positively skewed)';
    } else {
        shape = 'Left-skewed (negatively skewed)';
    }

    // Kurtosis description
    if (kurtosis > 1) {
        shape += ', Leptokurtic (heavy tails)';
    } else if (kurtosis < -1) {
        shape += ', Platykurtic (light tails)';
    } else {
        shape += ', Mesokurtic (normal-like tails)';
    }

    return shape;
}

/**
 * Generate random data and calculate skewness
 */
function generateAndCalculate(count, distribution, params) {
    const data = [];

    for (let i = 0; i < count; i++) {
        let value;

        switch (distribution) {
            case 'normal':
                const mean = params?.mean ?? 50;
                const stdDev = params?.stdDev ?? 15;
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
                const muLN = params?.mu ?? 0;
                const sigmaLN = params?.sigma ?? 1;
                const u = Math.random();
                const v = Math.random();
                const zLN = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
                value = Math.exp(muLN + sigmaLN * zLN);
                break;

            case 'gamma':
                // Simplified gamma using Marsaglia and Tsang's method
                const shape = params?.shape ?? 2;
                const scale = params?.scale ?? 1;
                // Approximation
                let gamma = 0;
                for (let j = 0; j < Math.ceil(shape); j++) {
                    gamma -= Math.log(Math.random());
                }
                value = gamma * scale / Math.ceil(shape) * shape;
                break;

            case 'beta':
                // Beta distribution using inversion
                const a = params?.a ?? 2;
                const b = params?.b ?? 5;
                // Simple approximation
                const u1b = Math.random();
                const u2b = Math.random();
                const zb = Math.sqrt(-2 * Math.log(u1b)) * Math.cos(2 * Math.PI * u2b);
                value = (zb * 0.15 + a / (a + b));
                value = Math.max(0.001, Math.min(0.999, value));
                break;

            case 'uniform':
                const min = params?.min ?? 0;
                const max = params?.max ?? 100;
                value = min + Math.random() * (max - min);
                break;

            case 'weibull':
                const k = params?.k ?? 1.5;
                const lambdaW = params?.lambda ?? 1;
                value = lambdaW * Math.pow(-Math.log(Math.random()), 1 / k);
                break;

            default:
                value = Math.random() * 100;
        }

        data.push(value);

        if (i % 100000 === 0 && i > 0) {
            self.postMessage({
                type: 'progress',
                percentage: Math.floor((i / count) * 50)
            });
        }
    }

    const result = calculateAllSkewness(data);

    // Theoretical skewness for comparison
    let theoreticalSkewness = null;
    if (distribution === 'normal') {
        theoreticalSkewness = 0;
    } else if (distribution === 'exponential') {
        theoreticalSkewness = 2;
    } else if (distribution === 'uniform') {
        theoreticalSkewness = 0;
    } else if (distribution === 'lognormal') {
        const sigma = params?.sigma ?? 1;
        theoreticalSkewness = (Math.exp(sigma * sigma) + 2) * Math.sqrt(Math.exp(sigma * sigma) - 1);
    }

    return {
        distribution,
        params,
        generated: count,
        ...result,
        theoreticalSkewness,
        sample: data.slice(0, 10).map(x => x.toFixed(4))
    };
}
