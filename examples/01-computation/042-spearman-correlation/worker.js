/**
 * Web Worker: Spearman Rank Correlation Calculator
 *
 * Calculates Spearman's rank correlation coefficient (ρ)
 * for measuring monotonic relationships between variables.
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'calculate':
                result = calculateSpearman(data.x, data.y);
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
 * Calculate Spearman rank correlation
 */
function calculateSpearman(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 3) throw new Error('Need at least 3 data points');

    // Get ranks with tie handling
    const rankX = getRanks(x);
    const rankY = getRanks(y);

    self.postMessage({ type: 'progress', percentage: 30 });

    // Calculate using Pearson on ranks (handles ties correctly)
    let sumRankX = 0, sumRankY = 0;
    for (let i = 0; i < n; i++) {
        sumRankX += rankX[i];
        sumRankY += rankY[i];
    }
    const meanRankX = sumRankX / n;
    const meanRankY = sumRankY / n;

    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        const devX = rankX[i] - meanRankX;
        const devY = rankY[i] - meanRankY;
        sumXY += devX * devY;
        sumX2 += devX * devX;
        sumY2 += devY * devY;

        if (i % 500000 === 0 && i > 0) {
            self.postMessage({ type: 'progress', percentage: 30 + Math.floor((i / n) * 50) });
        }
    }

    const denom = Math.sqrt(sumX2 * sumY2);
    const rho = denom !== 0 ? sumXY / denom : 0;

    // Also calculate simplified formula (without ties)
    let sumD2 = 0;
    for (let i = 0; i < n; i++) {
        const d = rankX[i] - rankY[i];
        sumD2 += d * d;
    }
    const rhoSimple = 1 - (6 * sumD2) / (n * (n * n - 1));

    // Significance testing
    const tStatistic = rho * Math.sqrt((n - 2) / (1 - rho * rho));
    const df = n - 2;

    // Check for ties
    const tiesX = countTies(x);
    const tiesY = countTies(y);
    const hasTies = tiesX.totalTies > 0 || tiesY.totalTies > 0;

    return {
        rho,
        rhoSimple,
        sumSquaredDiff: sumD2,
        tStatistic,
        degreesOfFreedom: df,
        n,
        hasTies,
        tiesX: tiesX.totalTies,
        tiesY: tiesY.totalTies,
        interpretation: interpretCorrelation(rho),
        strength: getStrength(rho),
        direction: rho > 0 ? 'Positive' : rho < 0 ? 'Negative' : 'None'
    };
}

/**
 * Calculate detailed analysis with rank tables
 */
function calculateDetailed(x, y) {
    const n = x.length;
    if (n !== y.length) throw new Error('Arrays must have same length');
    if (n < 3) throw new Error('Need at least 3 data points');
    if (n > 100) throw new Error('Detailed view limited to 100 data points');

    const rankX = getRanks(x);
    const rankY = getRanks(y);

    // Create detailed table
    const table = [];
    let sumD2 = 0;

    for (let i = 0; i < n; i++) {
        const d = rankX[i] - rankY[i];
        sumD2 += d * d;
        table.push({
            index: i + 1,
            x: x[i],
            y: y[i],
            rankX: rankX[i],
            rankY: rankY[i],
            d: d,
            d2: d * d
        });
    }

    // Calculate rho
    const rhoSimple = 1 - (6 * sumD2) / (n * (n * n - 1));

    // Calculate using Pearson on ranks
    let sumRankX = 0, sumRankY = 0;
    for (let i = 0; i < n; i++) {
        sumRankX += rankX[i];
        sumRankY += rankY[i];
    }
    const meanRankX = sumRankX / n;
    const meanRankY = sumRankY / n;

    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        sumXY += (rankX[i] - meanRankX) * (rankY[i] - meanRankY);
        sumX2 += Math.pow(rankX[i] - meanRankX, 2);
        sumY2 += Math.pow(rankY[i] - meanRankY, 2);
    }
    const rho = Math.sqrt(sumX2 * sumY2) !== 0 ? sumXY / Math.sqrt(sumX2 * sumY2) : 0;

    return {
        rho,
        rhoSimple,
        sumSquaredDiff: sumD2,
        table,
        n,
        formula: `ρ = 1 - (6 × ${sumD2}) / (${n} × (${n}² - 1)) = ${rhoSimple.toFixed(4)}`,
        interpretation: interpretCorrelation(rho),
        strength: getStrength(rho),
        direction: rho > 0 ? 'Positive' : rho < 0 ? 'Negative' : 'None'
    };
}

/**
 * Get ranks with average rank for ties
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
        const avgRank = (i + 1 + j) / 2;
        for (let k = i; k < j; k++) {
            ranks[indexed[k].idx] = avgRank;
        }

        i = j;
    }

    return ranks;
}

/**
 * Count ties in data
 */
function countTies(arr) {
    const counts = {};
    for (const val of arr) {
        counts[val] = (counts[val] || 0) + 1;
    }

    let totalTies = 0;
    const tieGroups = [];

    for (const val in counts) {
        if (counts[val] > 1) {
            totalTies += counts[val];
            tieGroups.push({ value: parseFloat(val), count: counts[val] });
        }
    }

    return { totalTies, tieGroups };
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

    return `${strength} ${direction} monotonic relationship`;
}

/**
 * Get strength category
 */
function getStrength(r) {
    const absR = Math.abs(r);
    if (absR < 0.1) return 'Negligible';
    if (absR < 0.3) return 'Weak';
    if (absR < 0.5) return 'Moderate';
    if (absR < 0.7) return 'Strong';
    return 'Very Strong';
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
            case 'monotonic':
                // Non-linear monotonic (exponential)
                yVal = Math.pow(xVal / 10, 2) + (Math.random() - 0.5) * 10;
                break;
            default:
                yVal = Math.random() * 100;
        }

        x.push(xVal);
        y.push(yVal);

        if (i % 50000 === 0 && i > 0) {
            self.postMessage({ type: 'progress', percentage: Math.floor((i / count) * 30) });
        }
    }

    const result = calculateSpearman(x, y);

    return {
        ...result,
        generated: count,
        relationship,
        sampleX: x.slice(0, 10).map(v => v.toFixed(2)),
        sampleY: y.slice(0, 10).map(v => v.toFixed(2))
    };
}
