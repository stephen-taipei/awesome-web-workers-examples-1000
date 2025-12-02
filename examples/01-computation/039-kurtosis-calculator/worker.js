/**
 * Web Worker: Kurtosis Calculator
 *
 * Calculates distribution kurtosis (fourth moment)
 * measuring tail heaviness and peakedness.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'excess':
                result = calculateExcessKurtosis(data);
                break;
            case 'fisher':
                result = calculateFisherKurtosis(data);
                break;
            case 'pearson':
                result = calculatePearsonKurtosis(data);
                break;
            case 'all':
                result = calculateAllKurtosis(data);
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
 * Calculate basic statistics and moments
 */
function calculateMoments(data) {
    const n = data.length;
    if (n === 0) throw new Error('Empty dataset');

    // First pass: mean
    let sum = 0;
    let min = data[0], max = data[0];

    for (let i = 0; i < n; i++) {
        sum += data[i];
        if (data[i] < min) min = data[i];
        if (data[i] > max) max = data[i];

        if (i % 2000000 === 0 && i > 0) {
            self.postMessage({ type: 'progress', percentage: Math.floor((i / n) * 30) });
        }
    }

    const mean = sum / n;

    // Second pass: central moments
    let m2 = 0, m3 = 0, m4 = 0;

    for (let i = 0; i < n; i++) {
        const dev = data[i] - mean;
        const dev2 = dev * dev;
        m2 += dev2;
        m3 += dev2 * dev;
        m4 += dev2 * dev2;

        if (i % 2000000 === 0 && i > 0) {
            self.postMessage({ type: 'progress', percentage: 30 + Math.floor((i / n) * 50) });
        }
    }

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
 * Calculate excess kurtosis (Fisher's definition)
 * Normal distribution has excess kurtosis = 0
 */
function calculateExcessKurtosis(data) {
    const stats = calculateMoments(data);
    const n = stats.n;

    if (n < 4) throw new Error('Need at least 4 data points');
    if (stats.variance === 0) {
        return { kurtosis: 0, interpretation: 'No variation in data', ...stats };
    }

    // Population excess kurtosis: g2 = m4/m2² - 3
    const g2 = (stats.m4 / n) / Math.pow(stats.variance, 2) - 3;

    // Sample excess kurtosis with bias correction (G2)
    const G2 = ((n + 1) * n * (n - 1)) / ((n - 2) * (n - 3)) *
               (stats.m4 / (stats.m2 * stats.m2 / n)) -
               3 * (n - 1) * (n - 1) / ((n - 2) * (n - 3));

    // Standard error
    const SE = Math.sqrt((24 * n * (n - 1) * (n - 1)) /
                        ((n - 3) * (n - 2) * (n + 3) * (n + 5)));

    return {
        excessKurtosis: g2,
        adjustedKurtosis: G2,
        type: 'Excess Kurtosis',
        formula: 'g2 = m4/σ⁴ - 3',
        interpretation: interpretKurtosis(g2),
        shape: getKurtosisShape(g2),
        standardError: SE,
        zScore: G2 / SE,
        ...stats
    };
}

/**
 * Calculate Fisher's kurtosis (same as excess kurtosis)
 */
function calculateFisherKurtosis(data) {
    return calculateExcessKurtosis(data);
}

/**
 * Calculate Pearson's kurtosis (non-excess, beta2)
 * Normal distribution has Pearson kurtosis = 3
 */
function calculatePearsonKurtosis(data) {
    const stats = calculateMoments(data);
    const n = stats.n;

    if (n < 4) throw new Error('Need at least 4 data points');
    if (stats.variance === 0) {
        return { kurtosis: 0, interpretation: 'No variation in data', ...stats };
    }

    // Pearson's kurtosis (beta2): m4/m2²
    const beta2 = (stats.m4 / n) / Math.pow(stats.variance, 2);
    const excessKurtosis = beta2 - 3;

    return {
        pearsonKurtosis: beta2,
        excessKurtosis,
        type: "Pearson's Kurtosis (β₂)",
        formula: 'β₂ = m4/σ⁴',
        normalValue: 3,
        interpretation: interpretKurtosis(excessKurtosis),
        shape: getKurtosisShape(excessKurtosis),
        ...stats
    };
}

/**
 * Calculate all kurtosis measures
 */
function calculateAllKurtosis(data) {
    const stats = calculateMoments(data);
    const n = stats.n;

    if (n < 4) throw new Error('Need at least 4 data points');

    self.postMessage({ type: 'progress', percentage: 80 });

    // Population measures
    const beta2 = stats.variance !== 0
        ? (stats.m4 / n) / Math.pow(stats.variance, 2)
        : 3;
    const g2 = beta2 - 3;

    // Sample adjusted kurtosis
    let G2 = 0;
    if (stats.variance !== 0 && n > 3) {
        G2 = ((n + 1) * n * (n - 1)) / ((n - 2) * (n - 3)) *
             (stats.m4 / (stats.m2 * stats.m2 / n)) -
             3 * (n - 1) * (n - 1) / ((n - 2) * (n - 3));
    }

    // Standard error
    const SE = n > 5 ? Math.sqrt((24 * n * (n - 1) * (n - 1)) /
                                ((n - 3) * (n - 2) * (n + 3) * (n + 5))) : null;

    // Skewness for context
    const skewness = stats.variance !== 0
        ? (stats.m3 / n) / Math.pow(stats.stdDev, 3)
        : 0;

    // Quartile kurtosis (robust)
    const sorted = [...data].sort((a, b) => a - b);
    const Q1 = getPercentile(sorted, 0.25);
    const Q3 = getPercentile(sorted, 0.75);
    const P10 = getPercentile(sorted, 0.10);
    const P90 = getPercentile(sorted, 0.90);

    const IQR = Q3 - Q1;
    const quartileKurtosis = IQR !== 0 ? (P90 - P10) / IQR : 0;

    return {
        pearsonKurtosis: beta2,
        excessKurtosis: g2,
        adjustedKurtosis: G2,
        quartileKurtosis,
        skewness,
        standardError: SE,
        zScore: SE ? G2 / SE : null,
        interpretation: interpretKurtosis(g2),
        shape: getKurtosisShape(g2),
        tailDescription: getTailDescription(g2),
        quartiles: { Q1, Q3, IQR, P10, P90 },
        ...stats
    };
}

/**
 * Helper: get percentile value
 */
function getPercentile(sorted, p) {
    const n = sorted.length;
    const pos = (n - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    return base + 1 < n
        ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
        : sorted[base];
}

/**
 * Interpret kurtosis value
 */
function interpretKurtosis(k) {
    if (Math.abs(k) < 0.5) return 'Approximately normal (mesokurtic)';
    if (k > 0) {
        if (k > 2) return 'Highly leptokurtic (heavy tails, sharp peak)';
        return 'Moderately leptokurtic';
    } else {
        if (k < -2) return 'Highly platykurtic (light tails, flat peak)';
        return 'Moderately platykurtic';
    }
}

/**
 * Get kurtosis shape classification
 */
function getKurtosisShape(k) {
    if (Math.abs(k) < 0.5) return 'Mesokurtic';
    if (k > 0) return 'Leptokurtic';
    return 'Platykurtic';
}

/**
 * Get tail description
 */
function getTailDescription(k) {
    if (Math.abs(k) < 0.5) {
        return 'Normal-like tails, similar to normal distribution';
    }
    if (k > 0) {
        return 'Heavy tails, more outliers than normal. Higher peak in center.';
    }
    return 'Light tails, fewer outliers than normal. Flatter peak in center.';
}

/**
 * Generate random data and calculate kurtosis
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

            case 'uniform':
                const min = params?.min ?? 0;
                const max = params?.max ?? 100;
                value = min + Math.random() * (max - min);
                break;

            case 'laplace':
                // Laplace has excess kurtosis = 3
                const mu = params?.mu ?? 0;
                const b = params?.b ?? 1;
                const u = Math.random() - 0.5;
                value = mu - b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
                break;

            case 't':
                // Student's t-distribution (high kurtosis for low df)
                const df = params?.df ?? 5;
                // Approximation using Box-Muller and chi-squared
                const u1t = Math.random();
                const u2t = Math.random();
                const zt = Math.sqrt(-2 * Math.log(u1t)) * Math.cos(2 * Math.PI * u2t);
                let chi2 = 0;
                for (let j = 0; j < df; j++) {
                    const ut = Math.random();
                    const vt = Math.random();
                    const z2 = Math.sqrt(-2 * Math.log(ut)) * Math.cos(2 * Math.PI * vt);
                    chi2 += z2 * z2;
                }
                value = zt / Math.sqrt(chi2 / df);
                break;

            case 'exponential':
                const lambda = params?.lambda ?? 1;
                value = -Math.log(Math.random()) / lambda;
                break;

            case 'beta':
                // Beta distribution
                const a = params?.a ?? 0.5;
                const bParam = params?.b ?? 0.5;
                // Simple beta approximation
                let sumA = 0, sumB = 0;
                for (let j = 0; j < 12; j++) {
                    sumA += Math.random();
                    sumB += Math.random();
                }
                value = (sumA / 12) / ((sumA + sumB) / 24) * a / (a + bParam);
                value = Math.max(0.001, Math.min(0.999, value));
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

    const result = calculateAllKurtosis(data);

    // Theoretical kurtosis for comparison
    let theoreticalKurtosis = null;
    if (distribution === 'normal') theoreticalKurtosis = 0;
    else if (distribution === 'uniform') theoreticalKurtosis = -1.2;
    else if (distribution === 'laplace') theoreticalKurtosis = 3;
    else if (distribution === 'exponential') theoreticalKurtosis = 6;
    else if (distribution === 't' && params?.df > 4) {
        theoreticalKurtosis = 6 / (params.df - 4);
    }

    return {
        distribution,
        params,
        generated: count,
        theoreticalKurtosis,
        ...result,
        sample: data.slice(0, 10).map(x => x.toFixed(4))
    };
}
