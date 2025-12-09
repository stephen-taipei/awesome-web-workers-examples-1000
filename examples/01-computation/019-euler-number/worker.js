/**
 * Web Worker: Euler Number Calculator
 *
 * Computes Euler numbers (also known as secant/tangent numbers).
 *
 * Euler numbers E(n) appear in the Taylor series expansion of sec(x) and tan(x).
 * - E(0) = 1
 * - E(2) = -1 (or |E(2)| = 1)
 * - E(4) = 5
 * - E(6) = -61
 * - Odd-indexed Euler numbers are 0
 *
 * This implementation calculates unsigned Euler numbers |E(n)|
 * using the recurrence relation and also supports Euler zigzag numbers (A(n)).
 */

/**
 * Calculate Euler zigzag numbers (alternating permutation count)
 * A(n) = number of alternating permutations of n elements
 *
 * A(0) = 1, A(1) = 1, A(2) = 1, A(3) = 2, A(4) = 5, A(5) = 16, ...
 *
 * Recurrence: A(n) = sum_{k=0}^{n-1} C(n-1,k) * A(k) * A(n-1-k) / 2
 * Or using: 2*A(n) = sum_{k=0}^{n-1} C(n-1,k) * A(k) * A(n-1-k)
 *
 * @param {number} n - Calculate zigzag numbers from A(0) to A(n)
 * @returns {Array<{index: number, value: string}>}
 */
function calculateZigzagNumbers(n) {
    if (n < 0) {
        throw new Error('n must be a non-negative integer');
    }

    const results = [];
    const A = [1n]; // A(0) = 1
    results.push({ index: 0, value: '1' });

    if (n === 0) return results;

    // Precompute binomial coefficients
    const binomial = computeBinomialTable(n);

    for (let i = 1; i <= n; i++) {
        // A(n) = (1/2) * sum_{k=0}^{n-1} C(n-1,k) * A(k) * A(n-1-k)
        let sum = 0n;
        for (let k = 0; k < i; k++) {
            sum += binomial[i - 1][k] * A[k] * A[i - 1 - k];
        }
        A[i] = sum / 2n;

        results.push({ index: i, value: A[i].toString() });

        if (i % 10 === 0 || i === n) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.round((i / n) * 100)
            });
        }
    }

    return results;
}

/**
 * Calculate unsigned Euler numbers |E(2n)|
 * Uses the relationship: |E(2n)| = A(2n) (zigzag number at even index)
 *
 * E(0) = 1, |E(2)| = 1, |E(4)| = 5, |E(6)| = 61, |E(8)| = 1385, ...
 *
 * @param {number} n - Calculate |E(0)|, |E(2)|, ..., |E(2n)|
 * @returns {Array<{index: number, value: string}>}
 */
function calculateEulerNumbers(n) {
    if (n < 0) {
        throw new Error('n must be a non-negative integer');
    }

    const results = [];
    const maxIndex = 2 * n;

    // Calculate zigzag numbers up to A(2n)
    const A = [1n];

    results.push({ index: 0, value: '1' }); // E(0) = 1

    if (n === 0) return results;

    const binomial = computeBinomialTable(maxIndex);

    for (let i = 1; i <= maxIndex; i++) {
        let sum = 0n;
        for (let k = 0; k < i; k++) {
            sum += binomial[i - 1][k] * A[k] * A[i - 1 - k];
        }
        A[i] = sum / 2n;

        // Only record even indices for Euler numbers
        if (i % 2 === 0) {
            results.push({ index: i, value: A[i].toString() });
        }

        if (i % 10 === 0 || i === maxIndex) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: maxIndex,
                percentage: Math.round((i / maxIndex) * 100)
            });
        }
    }

    return results;
}

/**
 * Calculate a single Euler number |E(2n)|
 *
 * @param {number} n - The index (will calculate E(2n))
 * @returns {string} The Euler number as string
 */
function calculateSingleEuler(n) {
    if (n < 0) {
        throw new Error('n must be a non-negative integer');
    }

    if (n === 0) return '1';

    const maxIndex = 2 * n;
    const A = [1n];
    const binomial = computeBinomialTable(maxIndex);

    for (let i = 1; i <= maxIndex; i++) {
        let sum = 0n;
        for (let k = 0; k < i; k++) {
            sum += binomial[i - 1][k] * A[k] * A[i - 1 - k];
        }
        A[i] = sum / 2n;

        if (i % 20 === 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: maxIndex,
                percentage: Math.round((i / maxIndex) * 100)
            });
        }
    }

    return A[maxIndex].toString();
}

/**
 * Compute binomial coefficient table C(n,k)
 *
 * @param {number} n - Maximum n value
 * @returns {Array<Array<bigint>>} Binomial coefficient table
 */
function computeBinomialTable(n) {
    const table = [];

    for (let i = 0; i <= n; i++) {
        table[i] = [];
        table[i][0] = 1n;
        table[i][i] = 1n;

        for (let j = 1; j < i; j++) {
            table[i][j] = table[i - 1][j - 1] + table[i - 1][j];
        }
    }

    return table;
}

/**
 * Calculate secant numbers (E(2n) / (2n)! coefficients)
 * These are related to Euler numbers
 *
 * @param {number} n - Number of terms
 * @returns {Array<{index: number, value: string}>}
 */
function calculateSecantNumbers(n) {
    // Secant numbers: 1, 1, 5, 61, 1385, 50521, ...
    // These are |E(2n)|
    return calculateEulerNumbers(n);
}

/**
 * Calculate tangent numbers (coefficients in tan(x) expansion)
 * T(n) = A(2n+1) / (2n+1)! * (2n+1)!
 *
 * T(0) = 1, T(1) = 2, T(2) = 16, T(3) = 272, ...
 *
 * @param {number} n - Number of terms
 * @returns {Array<{index: number, value: string}>}
 */
function calculateTangentNumbers(n) {
    if (n < 0) {
        throw new Error('n must be a non-negative integer');
    }

    const results = [];
    const maxIndex = 2 * n + 1;

    const A = [1n];
    const binomial = computeBinomialTable(maxIndex);

    for (let i = 1; i <= maxIndex; i++) {
        let sum = 0n;
        for (let k = 0; k < i; k++) {
            sum += binomial[i - 1][k] * A[k] * A[i - 1 - k];
        }
        A[i] = sum / 2n;

        // Record odd indices for tangent numbers
        if (i % 2 === 1) {
            results.push({
                index: (i - 1) / 2,
                value: A[i].toString()
            });
        }

        if (i % 10 === 0 || i === maxIndex) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: maxIndex,
                percentage: Math.round((i / maxIndex) * 100)
            });
        }
    }

    return results;
}

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, n, numberType } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'sequence':
                switch (numberType) {
                    case 'euler':
                        result = calculateEulerNumbers(n);
                        break;
                    case 'zigzag':
                        result = calculateZigzagNumbers(n);
                        break;
                    case 'tangent':
                        result = calculateTangentNumbers(n);
                        break;
                    default:
                        throw new Error(`Unknown number type: ${numberType}`);
                }
                break;

            case 'single':
                result = calculateSingleEuler(n);
                break;

            default:
                throw new Error(`Unknown calculation type: ${type}`);
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            calculationType: type,
            numberType: numberType,
            n: n,
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
