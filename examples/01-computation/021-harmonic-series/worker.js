/**
 * Web Worker: Harmonic Series Calculator
 *
 * Computes harmonic series and related sums:
 * H(n) = 1 + 1/2 + 1/3 + ... + 1/n
 *
 * Also supports:
 * - Generalized harmonic numbers H(n,m) = sum(1/k^m, k=1..n)
 * - Partial harmonic sums
 * - Alternating harmonic series
 */

/**
 * Calculate harmonic number H(n) using high precision
 * Uses Kahan summation for better numerical accuracy
 *
 * @param {number} n - Calculate H(n)
 * @param {number} precision - Decimal precision
 * @returns {string} The harmonic number
 */
function calculateHarmonic(n, precision = 15) {
    if (n < 1) {
        throw new Error('n must be a positive integer');
    }

    let sum = 0;
    let c = 0; // Compensation for lost low-order bits

    for (let k = 1; k <= n; k++) {
        const y = 1 / k - c;
        const t = sum + y;
        c = (t - sum) - y;
        sum = t;

        if (k % 100000 === 0 || k === n) {
            self.postMessage({
                type: 'progress',
                current: k,
                total: n,
                percentage: Math.round((k / n) * 100)
            });
        }
    }

    return sum.toFixed(precision);
}

/**
 * Calculate generalized harmonic number H(n,m)
 * H(n,m) = sum(1/k^m, k=1..n)
 *
 * @param {number} n - Upper limit
 * @param {number} m - Power
 * @param {number} precision - Decimal precision
 * @returns {string}
 */
function calculateGeneralizedHarmonic(n, m, precision = 15) {
    if (n < 1) {
        throw new Error('n must be a positive integer');
    }
    if (m < 1) {
        throw new Error('m must be a positive integer');
    }

    let sum = 0;
    let c = 0;

    for (let k = 1; k <= n; k++) {
        const y = 1 / Math.pow(k, m) - c;
        const t = sum + y;
        c = (t - sum) - y;
        sum = t;

        if (k % 100000 === 0 || k === n) {
            self.postMessage({
                type: 'progress',
                current: k,
                total: n,
                percentage: Math.round((k / n) * 100)
            });
        }
    }

    return sum.toFixed(precision);
}

/**
 * Calculate alternating harmonic series
 * 1 - 1/2 + 1/3 - 1/4 + ... = ln(2)
 *
 * @param {number} n - Number of terms
 * @param {number} precision - Decimal precision
 * @returns {string}
 */
function calculateAlternatingHarmonic(n, precision = 15) {
    if (n < 1) {
        throw new Error('n must be a positive integer');
    }

    let sum = 0;
    let c = 0;

    for (let k = 1; k <= n; k++) {
        const sign = k % 2 === 1 ? 1 : -1;
        const y = sign / k - c;
        const t = sum + y;
        c = (t - sum) - y;
        sum = t;

        if (k % 100000 === 0 || k === n) {
            self.postMessage({
                type: 'progress',
                current: k,
                total: n,
                percentage: Math.round((k / n) * 100)
            });
        }
    }

    return sum.toFixed(precision);
}

/**
 * Calculate harmonic series sequence H(1), H(2), ..., H(n)
 *
 * @param {number} n - Calculate up to H(n)
 * @returns {Array<{index: number, value: string}>}
 */
function calculateHarmonicSequence(n) {
    if (n < 1) {
        throw new Error('n must be a positive integer');
    }

    const results = [];
    let sum = 0;

    for (let k = 1; k <= n; k++) {
        sum += 1 / k;
        results.push({
            index: k,
            value: sum.toFixed(10)
        });

        if (k % 100 === 0 || k === n) {
            self.postMessage({
                type: 'progress',
                current: k,
                total: n,
                percentage: Math.round((k / n) * 100)
            });
        }
    }

    return results;
}

/**
 * Estimate n for which H(n) first exceeds target value
 * Uses approximation H(n) ≈ ln(n) + γ
 *
 * @param {number} target - Target value to exceed
 * @returns {{n: number, harmonicValue: string, gamma: string}}
 */
function findHarmonicExceeding(target) {
    const gamma = 0.5772156649015329; // Euler-Mascheroni constant

    // Initial estimate using H(n) ≈ ln(n) + γ
    let n = Math.ceil(Math.exp(target - gamma));

    let sum = 0;
    let k = 1;

    while (sum <= target) {
        sum += 1 / k;

        if (k % 1000000 === 0) {
            self.postMessage({
                type: 'progress',
                current: k,
                total: n * 2,
                percentage: Math.min(99, Math.round((k / (n * 2)) * 100))
            });
        }

        k++;
    }

    return {
        n: k - 1,
        harmonicValue: sum.toFixed(15),
        gamma: gamma.toFixed(15)
    };
}

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, n, m, target, precision } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'harmonic':
                result = calculateHarmonic(n, precision || 15);
                break;

            case 'generalized':
                result = calculateGeneralizedHarmonic(n, m, precision || 15);
                break;

            case 'alternating':
                result = calculateAlternatingHarmonic(n, precision || 15);
                break;

            case 'sequence':
                result = calculateHarmonicSequence(n);
                break;

            case 'exceeding':
                result = findHarmonicExceeding(target);
                break;

            default:
                throw new Error(`Unknown calculation type: ${type}`);
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            calculationType: type,
            n: n,
            m: m,
            target: target,
            result: result,
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message
        });
    }
};
