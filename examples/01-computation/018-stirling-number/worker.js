/**
 * Web Worker: Stirling Number Calculator
 *
 * Computes Stirling numbers of the first and second kind.
 *
 * Stirling numbers of the first kind s(n,k):
 * - Count permutations of n elements with exactly k cycles
 * - Recurrence: s(n,k) = s(n-1,k-1) + (n-1)*s(n-1,k)
 *
 * Stirling numbers of the second kind S(n,k):
 * - Count partitions of n elements into exactly k non-empty subsets
 * - Recurrence: S(n,k) = S(n-1,k-1) + k*S(n-1,k)
 */

/**
 * Calculate Stirling number of the first kind (unsigned)
 * |s(n,k)| = number of permutations with k cycles
 *
 * @param {number} n - Total elements
 * @param {number} k - Number of cycles
 * @returns {bigint} The Stirling number
 */
function stirlingFirst(n, k) {
    // Base cases
    if (n === 0 && k === 0) return 1n;
    if (n === 0 || k === 0) return 0n;
    if (k > n) return 0n;
    if (k === n) return 1n;

    // Use dynamic programming with space optimization
    // We only need the previous row
    let prev = new Array(k + 1).fill(0n);
    prev[0] = 1n; // s(0,0) = 1

    for (let i = 1; i <= n; i++) {
        const curr = new Array(Math.min(i, k) + 1).fill(0n);

        for (let j = 1; j <= Math.min(i, k); j++) {
            // s(n,k) = s(n-1,k-1) + (n-1)*s(n-1,k)
            const fromPrev = j <= prev.length - 1 ? prev[j] : 0n;
            const fromDiag = j - 1 <= prev.length - 1 ? prev[j - 1] : 0n;
            curr[j] = fromDiag + BigInt(i - 1) * fromPrev;
        }

        prev = curr;

        // Report progress
        if (i % 50 === 0 || i === n) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.round((i / n) * 100)
            });
        }
    }

    return prev[k] || 0n;
}

/**
 * Calculate Stirling number of the second kind
 * S(n,k) = number of partitions into k non-empty subsets
 *
 * @param {number} n - Total elements
 * @param {number} k - Number of subsets
 * @returns {bigint} The Stirling number
 */
function stirlingSecond(n, k) {
    // Base cases
    if (n === 0 && k === 0) return 1n;
    if (n === 0 || k === 0) return 0n;
    if (k > n) return 0n;
    if (k === 1 || k === n) return 1n;

    // Use dynamic programming with space optimization
    let prev = new Array(k + 1).fill(0n);
    prev[0] = 1n; // S(0,0) = 1

    for (let i = 1; i <= n; i++) {
        const curr = new Array(Math.min(i, k) + 1).fill(0n);

        for (let j = 1; j <= Math.min(i, k); j++) {
            // S(n,k) = S(n-1,k-1) + k*S(n-1,k)
            const fromPrev = j <= prev.length - 1 ? prev[j] : 0n;
            const fromDiag = j - 1 <= prev.length - 1 ? prev[j - 1] : 0n;
            curr[j] = fromDiag + BigInt(j) * fromPrev;
        }

        prev = curr;

        // Report progress
        if (i % 50 === 0 || i === n) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.round((i / n) * 100)
            });
        }
    }

    return prev[k] || 0n;
}

/**
 * Generate Stirling triangle (first or second kind)
 *
 * @param {number} n - Number of rows
 * @param {string} kind - 'first' or 'second'
 * @returns {Array<Array<string>>} The Stirling triangle
 */
function generateStirlingTriangle(n, kind) {
    const triangle = [];
    const calcFn = kind === 'first' ? stirlingFirstRow : stirlingSecondRow;

    for (let i = 0; i <= n; i++) {
        const row = [];
        for (let j = 0; j <= i; j++) {
            row.push(calcFn(i, j).toString());
        }
        triangle.push(row);

        if (i % 10 === 0 || i === n) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.round((i / n) * 100)
            });
        }
    }

    return triangle;
}

/**
 * Calculate a single row value for first kind (optimized for triangle)
 */
function stirlingFirstRow(n, k) {
    if (n === 0 && k === 0) return 1n;
    if (n === 0 || k === 0) return 0n;
    if (k > n) return 0n;
    if (k === n) return 1n;

    let prev = new Array(k + 1).fill(0n);
    prev[0] = 1n;

    for (let i = 1; i <= n; i++) {
        const curr = new Array(Math.min(i, k) + 1).fill(0n);
        for (let j = 1; j <= Math.min(i, k); j++) {
            const fromPrev = j <= prev.length - 1 ? prev[j] : 0n;
            const fromDiag = j - 1 <= prev.length - 1 ? prev[j - 1] : 0n;
            curr[j] = fromDiag + BigInt(i - 1) * fromPrev;
        }
        prev = curr;
    }

    return prev[k] || 0n;
}

/**
 * Calculate a single row value for second kind (optimized for triangle)
 */
function stirlingSecondRow(n, k) {
    if (n === 0 && k === 0) return 1n;
    if (n === 0 || k === 0) return 0n;
    if (k > n) return 0n;
    if (k === 1 || k === n) return 1n;

    let prev = new Array(k + 1).fill(0n);
    prev[0] = 1n;

    for (let i = 1; i <= n; i++) {
        const curr = new Array(Math.min(i, k) + 1).fill(0n);
        for (let j = 1; j <= Math.min(i, k); j++) {
            const fromPrev = j <= prev.length - 1 ? prev[j] : 0n;
            const fromDiag = j - 1 <= prev.length - 1 ? prev[j - 1] : 0n;
            curr[j] = fromDiag + BigInt(j) * fromPrev;
        }
        prev = curr;
    }

    return prev[k] || 0n;
}

/**
 * Calculate row of Stirling numbers for a given n
 *
 * @param {number} n - The row number
 * @param {string} kind - 'first' or 'second'
 * @returns {Array<{k: number, value: string}>} Array of Stirling numbers for row n
 */
function calculateRow(n, kind) {
    const results = [];
    const calcFn = kind === 'first' ? stirlingFirst : stirlingSecond;

    for (let k = 0; k <= n; k++) {
        results.push({
            k: k,
            value: calcFn(n, k).toString()
        });

        if (k % 10 === 0 || k === n) {
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

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, n, k, kind } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'single':
                // Calculate single Stirling number
                const calcFn = kind === 'first' ? stirlingFirst : stirlingSecond;
                result = calcFn(n, k).toString();
                break;

            case 'row':
                // Calculate entire row for given n
                result = calculateRow(n, kind);
                break;

            case 'triangle':
                // Generate Stirling triangle
                result = generateStirlingTriangle(n, kind);
                break;

            default:
                throw new Error(`Unknown calculation type: ${type}`);
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            calculationType: type,
            kind: kind,
            n: n,
            k: k,
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
