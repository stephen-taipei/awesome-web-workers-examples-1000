/**
 * Web Worker: Correlation Coefficient Calculator
 *
 * Calculates various correlation coefficients including
 * Pearson, Spearman, and Kendall correlations.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'pearson':
                result = calculatePearson(data.x, data.y);
                break;
            case 'spearman':
                result = calculateSpearman(data.x, data.y);
                break;
            case 'kendall':
                result = calculateKendall(data.x, data.y);
                break;
            case 'all':
                result = calculateAllCorrelations(data.x, data.y);
                break;
            case 'generate':
                result = generateAndCalculate(e.data.count, e.data.targetCorrelation);
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
 * Calculate Pearson correlation coefficient
 */
function calculatePearson(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 2) throw new Error('Need at least 2 data points');

    // Calculate means
    let sumX = 0, sumY = 0;
    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
    }
    const meanX = sumX / n;
    const meanY = sumY / n;

    // Calculate correlation components
    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        const devX = x[i] - meanX;
        const devY = y[i] - meanY;
        sumXY += devX * devY;
        sumX2 += devX * devX;
        sumY2 += devY * devY;

        if (i % 1000000 === 0 && i > 0) {
            self.postMessage({ type: 'progress', percentage: Math.floor((i / n) * 80) });
        }
    }

    const stdX = Math.sqrt(sumX2 / n);
    const stdY = Math.sqrt(sumY2 / n);

    // Pearson r
    const r = (stdX * stdY !== 0) ? sumXY / (n * stdX * stdY) : 0;

    // Coefficient of determination
    const r2 = r * r;

    // Standard error
    const se = n > 3 ? Math.sqrt((1 - r2) / (n - 2)) : null;

    // t-statistic for significance test
    const t = se && se !== 0 ? r / se * Math.sqrt(n - 2) : null;

    return {
        correlation: r,
        type: 'Pearson',
        formula: 'r = Σ(xᵢ - x̄)(yᵢ - ȳ) / (n × σₓ × σᵧ)',
        rSquared: r2,
        standardError: se,
        tStatistic: t,
        degreesOfFreedom: n - 2,
        meanX,
        meanY,
        stdDevX: stdX,
        stdDevY: stdY,
        n,
        interpretation: interpretCorrelation(r),
        strength: getCorrelationStrength(r),
        direction: r > 0 ? 'Positive' : r < 0 ? 'Negative' : 'None'
    };
}

/**
 * Calculate Spearman rank correlation coefficient
 */
function calculateSpearman(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 2) throw new Error('Need at least 2 data points');

    // Get ranks
    const rankX = getRanks(x);
    const rankY = getRanks(y);

    self.postMessage({ type: 'progress', percentage: 30 });

    // Calculate sum of squared rank differences
    let sumD2 = 0;
    for (let i = 0; i < n; i++) {
        const d = rankX[i] - rankY[i];
        sumD2 += d * d;
    }

    // Spearman's rho using ranks
    // Also calculate using Pearson on ranks for tie correction
    const pearsonOnRanks = calculatePearsonSimple(rankX, rankY);

    // Simplified formula (without ties)
    const rhoSimple = 1 - (6 * sumD2) / (n * (n * n - 1));

    self.postMessage({ type: 'progress', percentage: 80 });

    return {
        correlation: pearsonOnRanks.r, // More accurate with ties
        correlationSimple: rhoSimple,
        type: 'Spearman',
        formula: 'ρ = 1 - 6Σdᵢ² / (n(n² - 1))',
        sumSquaredDiff: sumD2,
        n,
        interpretation: interpretCorrelation(pearsonOnRanks.r),
        strength: getCorrelationStrength(pearsonOnRanks.r),
        direction: pearsonOnRanks.r > 0 ? 'Positive' : pearsonOnRanks.r < 0 ? 'Negative' : 'None',
        note: 'Measures monotonic relationship (not just linear)'
    };
}

/**
 * Calculate Kendall tau correlation coefficient
 */
function calculateKendall(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 2) throw new Error('Need at least 2 data points');

    // Count concordant and discordant pairs
    let concordant = 0;
    let discordant = 0;
    let tiesX = 0;
    let tiesY = 0;

    const totalPairs = (n * (n - 1)) / 2;
    let pairCount = 0;

    for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
            const xDiff = x[j] - x[i];
            const yDiff = y[j] - y[i];

            if (xDiff === 0 && yDiff === 0) {
                // Tie in both
            } else if (xDiff === 0) {
                tiesX++;
            } else if (yDiff === 0) {
                tiesY++;
            } else if (xDiff * yDiff > 0) {
                concordant++;
            } else {
                discordant++;
            }

            pairCount++;
            if (pairCount % 1000000 === 0) {
                self.postMessage({
                    type: 'progress',
                    percentage: Math.floor((pairCount / totalPairs) * 80)
                });
            }
        }
    }

    // Kendall tau-a (ignores ties)
    const tauA = (concordant - discordant) / totalPairs;

    // Kendall tau-b (accounts for ties)
    const n0 = totalPairs;
    const n1 = tiesX;
    const n2 = tiesY;
    const denominator = Math.sqrt((n0 - n1) * (n0 - n2));
    const tauB = denominator !== 0 ? (concordant - discordant) / denominator : 0;

    return {
        correlation: tauB,
        tauA,
        tauB,
        type: 'Kendall',
        formula: 'τ = (C - D) / √((n₀ - n₁)(n₀ - n₂))',
        concordantPairs: concordant,
        discordantPairs: discordant,
        tiesX,
        tiesY,
        totalPairs,
        n,
        interpretation: interpretCorrelation(tauB),
        strength: getCorrelationStrength(tauB),
        direction: tauB > 0 ? 'Positive' : tauB < 0 ? 'Negative' : 'None',
        note: 'Robust to outliers, measures ordinal association'
    };
}

/**
 * Calculate all correlation types
 */
function calculateAllCorrelations(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 2) throw new Error('Need at least 2 data points');

    self.postMessage({ type: 'progress', percentage: 10 });
    const pearson = calculatePearson(x, y);

    self.postMessage({ type: 'progress', percentage: 40 });
    const spearman = calculateSpearman(x, y);

    self.postMessage({ type: 'progress', percentage: 70 });
    const kendall = calculateKendall(x, y);

    return {
        pearson: pearson.correlation,
        spearman: spearman.correlation,
        kendall: kendall.correlation,
        pearsonDetails: pearson,
        spearmanDetails: spearman,
        kendallDetails: kendall,
        n,
        comparison: compareCorrelations(pearson.correlation, spearman.correlation, kendall.correlation),
        recommendation: getRecommendation(pearson, spearman, kendall)
    };
}

/**
 * Helper: Simple Pearson calculation
 */
function calculatePearsonSimple(x, y) {
    const n = x.length;
    let sumX = 0, sumY = 0;
    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
    }
    const meanX = sumX / n;
    const meanY = sumY / n;

    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        const devX = x[i] - meanX;
        const devY = y[i] - meanY;
        sumXY += devX * devY;
        sumX2 += devX * devX;
        sumY2 += devY * devY;
    }

    const denom = Math.sqrt(sumX2 * sumY2);
    return { r: denom !== 0 ? sumXY / denom : 0 };
}

/**
 * Get ranks with tie handling (average rank)
 */
function getRanks(arr) {
    const n = arr.length;
    const indexed = arr.map((val, idx) => ({ val, idx }));
    indexed.sort((a, b) => a.val - b.val);

    const ranks = new Array(n);
    let i = 0;

    while (i < n) {
        let j = i;
        // Find all ties
        while (j < n && indexed[j].val === indexed[i].val) {
            j++;
        }

        // Average rank for ties
        const avgRank = (i + j + 1) / 2;
        for (let k = i; k < j; k++) {
            ranks[indexed[k].idx] = avgRank;
        }

        i = j;
    }

    return ranks;
}

/**
 * Interpret correlation value
 */
function interpretCorrelation(r) {
    const absR = Math.abs(r);
    let strength;

    if (absR < 0.1) strength = 'negligible';
    else if (absR < 0.3) strength = 'weak';
    else if (absR < 0.5) strength = 'moderate';
    else if (absR < 0.7) strength = 'strong';
    else strength = 'very strong';

    const direction = r > 0 ? 'positive' : r < 0 ? 'negative' : 'no';

    return `${strength} ${direction} correlation`;
}

/**
 * Get correlation strength category
 */
function getCorrelationStrength(r) {
    const absR = Math.abs(r);
    if (absR < 0.1) return 'Negligible';
    if (absR < 0.3) return 'Weak';
    if (absR < 0.5) return 'Moderate';
    if (absR < 0.7) return 'Strong';
    return 'Very Strong';
}

/**
 * Compare different correlation measures
 */
function compareCorrelations(pearson, spearman, kendall) {
    const diffs = {
        pearsonSpearman: Math.abs(pearson - spearman),
        pearsonKendall: Math.abs(pearson - kendall),
        spearmanKendall: Math.abs(spearman - kendall)
    };

    let note = '';
    if (diffs.pearsonSpearman > 0.2) {
        note = 'Large difference between Pearson and Spearman suggests non-linear relationship. ';
    }
    if (Math.abs(spearman) > Math.abs(pearson) + 0.1) {
        note += 'Spearman > Pearson suggests monotonic but non-linear relationship. ';
    }

    return {
        differences: diffs,
        note: note || 'Correlations are relatively consistent.'
    };
}

/**
 * Get recommendation for which correlation to use
 */
function getRecommendation(pearson, spearman, kendall) {
    const recommendations = [];

    recommendations.push({
        method: 'Pearson',
        use: 'Linear relationships with normally distributed data',
        value: pearson.correlation
    });

    recommendations.push({
        method: 'Spearman',
        use: 'Monotonic relationships, ordinal data, or non-normal distributions',
        value: spearman.correlation
    });

    recommendations.push({
        method: 'Kendall',
        use: 'Small samples, many ties, or when robustness is important',
        value: kendall.correlation
    });

    return recommendations;
}

/**
 * Generate correlated data and calculate correlations
 */
function generateAndCalculate(count, targetCorrelation) {
    const x = [];
    const y = [];

    // Generate correlated normal data using Cholesky decomposition
    const rho = Math.max(-1, Math.min(1, targetCorrelation));

    for (let i = 0; i < count; i++) {
        // Generate two independent standard normal variables
        const u1 = Math.random();
        const u2 = Math.random();
        const u3 = Math.random();
        const u4 = Math.random();

        const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        const z2 = Math.sqrt(-2 * Math.log(u3)) * Math.cos(2 * Math.PI * u4);

        // Create correlated variables
        x.push(z1);
        y.push(rho * z1 + Math.sqrt(1 - rho * rho) * z2);

        if (i % 100000 === 0 && i > 0) {
            self.postMessage({ type: 'progress', percentage: Math.floor((i / count) * 40) });
        }
    }

    const result = calculateAllCorrelations(x, y);

    return {
        ...result,
        generated: count,
        targetCorrelation,
        actualCorrelation: result.pearson,
        sampleX: x.slice(0, 10).map(v => v.toFixed(4)),
        sampleY: y.slice(0, 10).map(v => v.toFixed(4))
    };
}
