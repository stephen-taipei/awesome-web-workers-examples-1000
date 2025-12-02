/**
 * Web Worker: Kendall Tau Correlation Calculator
 *
 * Calculates Kendall's tau correlation coefficient
 * based on concordant and discordant pairs.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'tau-a':
                result = calculateTauA(data.x, data.y);
                break;
            case 'tau-b':
                result = calculateTauB(data.x, data.y);
                break;
            case 'tau-c':
                result = calculateTauC(data.x, data.y);
                break;
            case 'all':
                result = calculateAllTau(data.x, data.y);
                break;
            case 'detailed':
                result = calculateDetailed(data.x, data.y);
                break;
            case 'generate':
                result = generateAndCalculate(e.data.count, e.data.relationship);
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
 * Calculate Kendall's tau-a (ignores ties)
 */
function calculateTauA(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 2) throw new Error('Need at least 2 data points');

    const { concordant, discordant } = countPairs(x, y);
    const totalPairs = (n * (n - 1)) / 2;

    const tauA = (concordant - discordant) / totalPairs;

    return {
        tau: tauA,
        type: 'Kendall τ-a',
        concordant,
        discordant,
        totalPairs,
        n,
        interpretation: interpretTau(tauA),
        strength: getStrength(tauA),
        direction: tauA > 0 ? 'Positive' : tauA < 0 ? 'Negative' : 'None',
        note: 'Does not account for ties'
    };
}

/**
 * Calculate Kendall's tau-b (accounts for ties)
 */
function calculateTauB(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 2) throw new Error('Need at least 2 data points');

    const { concordant, discordant, tiesX, tiesY, tiesBoth } = countPairsWithTies(x, y);

    const n0 = (n * (n - 1)) / 2;
    const n1 = tiesX;
    const n2 = tiesY;

    const denominator = Math.sqrt((n0 - n1) * (n0 - n2));
    const tauB = denominator !== 0 ? (concordant - discordant) / denominator : 0;

    // Standard error approximation
    const v0 = n * (n - 1) * (2 * n + 5);
    const v1 = calculateTieCorrection(x);
    const v2 = calculateTieCorrection(y);
    const variance = (v0 - v1 - v2) / 18 +
                    (calculateTieProduct1(x) * calculateTieProduct1(y)) / (9 * n * (n - 1) * (n - 2)) +
                    (calculateTieProduct2(x) * calculateTieProduct2(y)) / (2 * n * (n - 1));
    const se = Math.sqrt(variance) / n0;

    const zScore = se !== 0 ? tauB / se : 0;

    return {
        tau: tauB,
        type: 'Kendall τ-b',
        concordant,
        discordant,
        tiesX: n1,
        tiesY: n2,
        tiesBoth,
        totalPairs: n0,
        n,
        standardError: se,
        zScore,
        interpretation: interpretTau(tauB),
        strength: getStrength(tauB),
        direction: tauB > 0 ? 'Positive' : tauB < 0 ? 'Negative' : 'None',
        note: 'Recommended for square tables with ties'
    };
}

/**
 * Calculate Kendall's tau-c (Stuart's tau-c, for rectangular tables)
 */
function calculateTauC(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 2) throw new Error('Need at least 2 data points');

    const { concordant, discordant } = countPairs(x, y);

    // Get number of unique values (categories)
    const m = Math.min(new Set(x).size, new Set(y).size);

    const tauC = (2 * m * (concordant - discordant)) / (n * n * (m - 1));

    return {
        tau: tauC,
        type: 'Kendall τ-c',
        concordant,
        discordant,
        categories: m,
        n,
        interpretation: interpretTau(tauC),
        strength: getStrength(tauC),
        direction: tauC > 0 ? 'Positive' : tauC < 0 ? 'Negative' : 'None',
        note: 'Recommended for rectangular tables'
    };
}

/**
 * Calculate all tau variants
 */
function calculateAllTau(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 2) throw new Error('Need at least 2 data points');

    self.postMessage({ type: 'progress', percentage: 10 });

    const { concordant, discordant, tiesX, tiesY, tiesBoth } = countPairsWithTies(x, y);

    self.postMessage({ type: 'progress', percentage: 70 });

    const n0 = (n * (n - 1)) / 2;

    // Tau-a
    const tauA = (concordant - discordant) / n0;

    // Tau-b
    const denomB = Math.sqrt((n0 - tiesX) * (n0 - tiesY));
    const tauB = denomB !== 0 ? (concordant - discordant) / denomB : 0;

    // Tau-c
    const m = Math.min(new Set(x).size, new Set(y).size);
    const tauC = m > 1 ? (2 * m * (concordant - discordant)) / (n * n * (m - 1)) : 0;

    // Gamma (Goodman-Kruskal)
    const gamma = (concordant + discordant) !== 0 ?
                  (concordant - discordant) / (concordant + discordant) : 0;

    return {
        tauA,
        tauB,
        tauC,
        gamma,
        concordant,
        discordant,
        tiesX,
        tiesY,
        tiesBoth,
        totalPairs: n0,
        n,
        categories: m,
        interpretation: interpretTau(tauB),
        strength: getStrength(tauB),
        direction: tauB > 0 ? 'Positive' : tauB < 0 ? 'Negative' : 'None',
        recommendation: getRecommendation(tiesX, tiesY, m, n)
    };
}

/**
 * Detailed calculation with pair analysis
 */
function calculateDetailed(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 2) throw new Error('Need at least 2 data points');
    if (n > 20) throw new Error('Detailed view limited to 20 data points');

    const pairs = [];
    let concordant = 0, discordant = 0, tiesX = 0, tiesY = 0, tiesBoth = 0;

    for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
            const xDiff = x[j] - x[i];
            const yDiff = y[j] - y[i];
            let pairType;

            if (xDiff === 0 && yDiff === 0) {
                tiesBoth++;
                pairType = 'Both Tie';
            } else if (xDiff === 0) {
                tiesX++;
                pairType = 'X Tie';
            } else if (yDiff === 0) {
                tiesY++;
                pairType = 'Y Tie';
            } else if (xDiff * yDiff > 0) {
                concordant++;
                pairType = 'Concordant';
            } else {
                discordant++;
                pairType = 'Discordant';
            }

            pairs.push({
                i: i + 1,
                j: j + 1,
                xi: x[i],
                xj: x[j],
                yi: y[i],
                yj: y[j],
                xSign: Math.sign(xDiff),
                ySign: Math.sign(yDiff),
                type: pairType
            });
        }
    }

    const n0 = (n * (n - 1)) / 2;
    const tauA = (concordant - discordant) / n0;
    const denomB = Math.sqrt((n0 - tiesX) * (n0 - tiesY));
    const tauB = denomB !== 0 ? (concordant - discordant) / denomB : 0;

    return {
        tauA,
        tauB,
        concordant,
        discordant,
        tiesX,
        tiesY,
        tiesBoth,
        totalPairs: n0,
        pairs,
        n,
        interpretation: interpretTau(tauB),
        strength: getStrength(tauB),
        direction: tauB > 0 ? 'Positive' : tauB < 0 ? 'Negative' : 'None'
    };
}

/**
 * Count concordant and discordant pairs (no tie tracking)
 */
function countPairs(x, y) {
    const n = x.length;
    let concordant = 0, discordant = 0;
    const totalPairs = (n * (n - 1)) / 2;
    let pairCount = 0;

    for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
            const xDiff = x[j] - x[i];
            const yDiff = y[j] - y[i];

            if (xDiff * yDiff > 0) concordant++;
            else if (xDiff * yDiff < 0) discordant++;

            pairCount++;
            if (pairCount % 500000 === 0) {
                self.postMessage({
                    type: 'progress',
                    percentage: Math.floor((pairCount / totalPairs) * 80)
                });
            }
        }
    }

    return { concordant, discordant };
}

/**
 * Count pairs with tie tracking
 */
function countPairsWithTies(x, y) {
    const n = x.length;
    let concordant = 0, discordant = 0, tiesX = 0, tiesY = 0, tiesBoth = 0;
    const totalPairs = (n * (n - 1)) / 2;
    let pairCount = 0;

    for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
            const xDiff = x[j] - x[i];
            const yDiff = y[j] - y[i];

            if (xDiff === 0 && yDiff === 0) {
                tiesBoth++;
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
            if (pairCount % 500000 === 0) {
                self.postMessage({
                    type: 'progress',
                    percentage: Math.floor((pairCount / totalPairs) * 80)
                });
            }
        }
    }

    return { concordant, discordant, tiesX, tiesY, tiesBoth };
}

/**
 * Calculate tie correction term
 */
function calculateTieCorrection(arr) {
    const counts = {};
    for (const val of arr) {
        counts[val] = (counts[val] || 0) + 1;
    }

    let correction = 0;
    for (const val in counts) {
        const t = counts[val];
        if (t > 1) {
            correction += t * (t - 1) * (2 * t + 5);
        }
    }
    return correction;
}

/**
 * Calculate tie product term 1
 */
function calculateTieProduct1(arr) {
    const counts = {};
    for (const val of arr) {
        counts[val] = (counts[val] || 0) + 1;
    }

    let product = 0;
    for (const val in counts) {
        const t = counts[val];
        if (t > 1) {
            product += t * (t - 1) * (t - 2);
        }
    }
    return product;
}

/**
 * Calculate tie product term 2
 */
function calculateTieProduct2(arr) {
    const counts = {};
    for (const val of arr) {
        counts[val] = (counts[val] || 0) + 1;
    }

    let product = 0;
    for (const val in counts) {
        const t = counts[val];
        if (t > 1) {
            product += t * (t - 1);
        }
    }
    return product;
}

/**
 * Interpret tau value
 */
function interpretTau(tau) {
    const absTau = Math.abs(tau);
    let strength;

    if (absTau < 0.1) strength = 'negligible';
    else if (absTau < 0.2) strength = 'weak';
    else if (absTau < 0.3) strength = 'moderate';
    else if (absTau < 0.5) strength = 'strong';
    else strength = 'very strong';

    const direction = tau > 0 ? 'positive' : tau < 0 ? 'negative' : 'no';

    return `${strength} ${direction} ordinal association`;
}

/**
 * Get strength category
 */
function getStrength(tau) {
    const absTau = Math.abs(tau);
    if (absTau < 0.1) return 'Negligible';
    if (absTau < 0.2) return 'Weak';
    if (absTau < 0.3) return 'Moderate';
    if (absTau < 0.5) return 'Strong';
    return 'Very Strong';
}

/**
 * Get recommendation for which tau to use
 */
function getRecommendation(tiesX, tiesY, categories, n) {
    if (tiesX === 0 && tiesY === 0) {
        return 'No ties present. All tau variants are equivalent.';
    }
    if (categories === n) {
        return 'Use τ-b for tied data.';
    }
    if (categories < n * 0.5) {
        return 'Use τ-c for categorical data with few categories.';
    }
    return 'Use τ-b as the general recommendation.';
}

/**
 * Generate data and calculate
 */
function generateAndCalculate(count, relationship) {
    const x = [];
    const y = [];

    for (let i = 0; i < count; i++) {
        const xVal = Math.random() * 100;
        let yVal;

        switch (relationship) {
            case 'perfect':
                yVal = xVal;
                break;
            case 'strong':
                yVal = xVal + (Math.random() - 0.5) * 20;
                break;
            case 'moderate':
                yVal = xVal * 0.5 + Math.random() * 50;
                break;
            case 'weak':
                yVal = xVal * 0.2 + Math.random() * 80;
                break;
            case 'none':
                yVal = Math.random() * 100;
                break;
            case 'negative':
                yVal = 100 - xVal + (Math.random() - 0.5) * 20;
                break;
            default:
                yVal = Math.random() * 100;
        }

        x.push(xVal);
        y.push(yVal);

        if (i % 1000 === 0 && i > 0) {
            self.postMessage({ type: 'progress', percentage: Math.floor((i / count) * 20) });
        }
    }

    const result = calculateAllTau(x, y);

    return {
        ...result,
        generated: count,
        relationship,
        sampleX: x.slice(0, 10).map(v => v.toFixed(2)),
        sampleY: y.slice(0, 10).map(v => v.toFixed(2))
    };
}
