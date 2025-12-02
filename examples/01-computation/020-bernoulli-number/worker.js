/**
 * Web Worker: Bernoulli Number Calculator
 *
 * Computes Bernoulli numbers using the Akiyama-Tanigawa algorithm.
 *
 * Bernoulli numbers B(n) are a sequence of rational numbers that appear
 * in number theory, analysis, and combinatorics.
 *
 * B(0) = 1
 * B(1) = -1/2 (or +1/2 in some conventions)
 * B(2) = 1/6
 * B(3) = 0
 * B(4) = -1/30
 * ...
 * All odd Bernoulli numbers (except B(1)) are 0.
 */

/**
 * Compute GCD of two BigInts
 * @param {bigint} a
 * @param {bigint} b
 * @returns {bigint}
 */
function gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

/**
 * Rational number class for exact arithmetic
 */
class Rational {
    constructor(numerator, denominator = 1n) {
        if (typeof numerator === 'number') {
            numerator = BigInt(numerator);
        }
        if (typeof denominator === 'number') {
            denominator = BigInt(denominator);
        }

        if (denominator === 0n) {
            throw new Error('Division by zero');
        }

        // Normalize sign
        if (denominator < 0n) {
            numerator = -numerator;
            denominator = -denominator;
        }

        // Reduce to lowest terms
        const g = gcd(numerator, denominator);
        this.num = numerator / g;
        this.den = denominator / g;
    }

    add(other) {
        return new Rational(
            this.num * other.den + other.num * this.den,
            this.den * other.den
        );
    }

    subtract(other) {
        return new Rational(
            this.num * other.den - other.num * this.den,
            this.den * other.den
        );
    }

    multiply(other) {
        return new Rational(
            this.num * other.num,
            this.den * other.den
        );
    }

    divide(other) {
        return new Rational(
            this.num * other.den,
            this.den * other.num
        );
    }

    toString() {
        if (this.den === 1n) {
            return this.num.toString();
        }
        return `${this.num}/${this.den}`;
    }

    toDecimal(precision = 20) {
        const sign = this.num < 0n ? '-' : '';
        let num = this.num < 0n ? -this.num : this.num;
        const den = this.den;

        const intPart = num / den;
        let remainder = num % den;

        if (remainder === 0n) {
            return sign + intPart.toString();
        }

        let decimal = '';
        for (let i = 0; i < precision && remainder !== 0n; i++) {
            remainder *= 10n;
            decimal += (remainder / den).toString();
            remainder = remainder % den;
        }

        return sign + intPart.toString() + '.' + decimal;
    }
}

/**
 * Calculate Bernoulli numbers using Akiyama-Tanigawa algorithm
 *
 * This algorithm computes B(0) through B(n) efficiently.
 *
 * @param {number} n - Calculate Bernoulli numbers from B(0) to B(n)
 * @returns {Array<{index: number, fraction: string, decimal: string}>}
 */
function calculateBernoulliNumbers(n) {
    if (n < 0) {
        throw new Error('n must be a non-negative integer');
    }

    const results = [];

    // Akiyama-Tanigawa algorithm
    // Initialize array A with A[j] = 1/(j+1)
    const A = [];
    for (let j = 0; j <= n; j++) {
        A[j] = new Rational(1n, BigInt(j + 1));
    }

    for (let m = 0; m <= n; m++) {
        // B(m) = A[0] at step m
        results.push({
            index: m,
            fraction: A[0].toString(),
            decimal: A[0].toDecimal(15)
        });

        // Update A for next iteration
        for (let j = 0; j <= n - m - 1; j++) {
            // A[j] = (j+1) * (A[j] - A[j+1])
            A[j] = new Rational(BigInt(j + 1), 1n).multiply(
                A[j].subtract(A[j + 1])
            );
        }

        // Report progress
        if (m % 10 === 0 || m === n) {
            self.postMessage({
                type: 'progress',
                current: m,
                total: n,
                percentage: Math.round((m / n) * 100)
            });
        }
    }

    return results;
}

/**
 * Calculate a single Bernoulli number B(n)
 *
 * @param {number} n - The index
 * @returns {{fraction: string, decimal: string}}
 */
function calculateSingleBernoulli(n) {
    if (n < 0) {
        throw new Error('n must be a non-negative integer');
    }

    // Odd Bernoulli numbers (except B(1)) are 0
    if (n > 1 && n % 2 === 1) {
        return { fraction: '0', decimal: '0' };
    }

    const A = [];
    for (let j = 0; j <= n; j++) {
        A[j] = new Rational(1n, BigInt(j + 1));
    }

    for (let m = 0; m <= n; m++) {
        if (m === n) {
            return {
                fraction: A[0].toString(),
                decimal: A[0].toDecimal(20)
            };
        }

        for (let j = 0; j <= n - m - 1; j++) {
            A[j] = new Rational(BigInt(j + 1), 1n).multiply(
                A[j].subtract(A[j + 1])
            );
        }

        if (m % 20 === 0) {
            self.postMessage({
                type: 'progress',
                current: m,
                total: n,
                percentage: Math.round((m / n) * 100)
            });
        }
    }

    return { fraction: '0', decimal: '0' };
}

/**
 * Calculate only non-zero Bernoulli numbers (even indices + B(1))
 *
 * @param {number} n - Calculate up to index 2n
 * @returns {Array<{index: number, fraction: string, decimal: string}>}
 */
function calculateNonZeroBernoulli(n) {
    const allBernoulli = calculateBernoulliNumbers(2 * n);

    // Filter to include only B(0), B(1), and even indices
    return allBernoulli.filter(b =>
        b.index === 0 || b.index === 1 || (b.index % 2 === 0)
    );
}

/**
 * Calculate sum of powers formula coefficients
 * Uses Bernoulli numbers: sum(k^p, k=1..n) = (1/(p+1)) * sum(C(p+1,k)*B(k)*n^(p+1-k))
 *
 * @param {number} p - The power
 * @returns {Array<{k: number, coefficient: string}>}
 */
function calculateSumOfPowersCoefficients(p) {
    if (p < 0) {
        throw new Error('p must be a non-negative integer');
    }

    const results = [];
    const bernoulli = [];

    // Calculate needed Bernoulli numbers
    const A = [];
    for (let j = 0; j <= p; j++) {
        A[j] = new Rational(1n, BigInt(j + 1));
    }

    for (let m = 0; m <= p; m++) {
        bernoulli[m] = A[0];

        for (let j = 0; j <= p - m - 1; j++) {
            A[j] = new Rational(BigInt(j + 1), 1n).multiply(
                A[j].subtract(A[j + 1])
            );
        }
    }

    // Calculate binomial coefficients and formula coefficients
    const binomial = [];
    for (let i = 0; i <= p + 1; i++) {
        binomial[i] = [];
        binomial[i][0] = 1n;
        binomial[i][i] = 1n;
        for (let j = 1; j < i; j++) {
            binomial[i][j] = binomial[i - 1][j - 1] + binomial[i - 1][j];
        }
    }

    for (let k = 0; k <= p; k++) {
        const coef = new Rational(binomial[p + 1][k], BigInt(p + 1))
            .multiply(bernoulli[k]);

        results.push({
            k: k,
            power: p + 1 - k,
            coefficient: coef.toString()
        });
    }

    return results;
}

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, n } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'sequence':
                result = calculateBernoulliNumbers(n);
                break;

            case 'nonzero':
                result = calculateNonZeroBernoulli(n);
                break;

            case 'single':
                result = calculateSingleBernoulli(n);
                break;

            case 'sumofpowers':
                result = calculateSumOfPowersCoefficients(n);
                break;

            default:
                throw new Error(`Unknown calculation type: ${type}`);
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            calculationType: type,
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
