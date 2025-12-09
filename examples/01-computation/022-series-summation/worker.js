/**
 * Web Worker: Series Summation Calculator
 *
 * Computes various mathematical series with configurable formulas.
 * Supports predefined series and custom series expressions.
 */

/**
 * Predefined series formulas
 */
const SERIES = {
    // Geometric series: sum(r^k, k=0..n) = (1-r^(n+1))/(1-r)
    geometric: (k, params) => Math.pow(params.r, k),

    // Power series: sum(k^p, k=1..n)
    power: (k, params) => Math.pow(k, params.p),

    // Exponential series: sum(x^k/k!, k=0..n) ≈ e^x
    exponential: (k, params) => Math.pow(params.x, k) / factorial(k),

    // Sine series: sum((-1)^k * x^(2k+1)/(2k+1)!, k=0..n)
    sine: (k, params) => Math.pow(-1, k) * Math.pow(params.x, 2 * k + 1) / factorial(2 * k + 1),

    // Cosine series: sum((-1)^k * x^(2k)/(2k)!, k=0..n)
    cosine: (k, params) => Math.pow(-1, k) * Math.pow(params.x, 2 * k) / factorial(2 * k),

    // Natural log series: sum((-1)^(k+1) * x^k/k, k=1..n) = ln(1+x)
    logarithm: (k, params) => Math.pow(-1, k + 1) * Math.pow(params.x, k) / k,

    // Arctan series: sum((-1)^k * x^(2k+1)/(2k+1), k=0..n)
    arctan: (k, params) => Math.pow(-1, k) * Math.pow(params.x, 2 * k + 1) / (2 * k + 1),

    // Basel problem: sum(1/k^2, k=1..n) → π²/6
    basel: (k, params) => 1 / (k * k),

    // Leibniz formula: sum((-1)^k/(2k+1), k=0..n) → π/4
    leibniz: (k, params) => Math.pow(-1, k) / (2 * k + 1),

    // Riemann zeta: sum(1/k^s, k=1..n)
    zeta: (k, params) => 1 / Math.pow(k, params.s),

    // Fibonacci reciprocal: sum(1/F(k), k=1..n)
    fibonacciReciprocal: (k, params) => 1 / fibonacci(k)
};

/**
 * Calculate factorial (with memoization)
 */
const factorialCache = [1, 1];
function factorial(n) {
    if (n < 0) return NaN;
    if (n < factorialCache.length) return factorialCache[n];

    let result = factorialCache[factorialCache.length - 1];
    for (let i = factorialCache.length; i <= n; i++) {
        result *= i;
        factorialCache[i] = result;
    }
    return result;
}

/**
 * Calculate Fibonacci number (with memoization)
 */
const fibCache = [0, 1];
function fibonacci(n) {
    if (n < fibCache.length) return fibCache[n];

    for (let i = fibCache.length; i <= n; i++) {
        fibCache[i] = fibCache[i - 1] + fibCache[i - 2];
    }
    return fibCache[n];
}

/**
 * Calculate series sum using Kahan summation
 *
 * @param {string} seriesName - Name of predefined series
 * @param {number} n - Number of terms
 * @param {object} params - Series parameters
 * @param {number} startIndex - Starting index (0 or 1)
 * @returns {object} Result with sum and terms
 */
function calculateSeries(seriesName, n, params, startIndex = 0) {
    const formula = SERIES[seriesName];
    if (!formula) {
        throw new Error(`Unknown series: ${seriesName}`);
    }

    let sum = 0;
    let c = 0; // Kahan compensation
    const terms = [];

    for (let k = startIndex; k <= n; k++) {
        const term = formula(k, params);

        if (!isFinite(term)) break;

        const y = term - c;
        const t = sum + y;
        c = (t - sum) - y;
        sum = t;

        if (k <= startIndex + 20 || k === n) {
            terms.push({ k, term: term.toExponential(6), partialSum: sum.toFixed(12) });
        }

        if (k % 10000 === 0 || k === n) {
            self.postMessage({
                type: 'progress',
                current: k - startIndex,
                total: n - startIndex,
                percentage: Math.round(((k - startIndex) / (n - startIndex)) * 100)
            });
        }
    }

    return {
        sum: sum.toFixed(15),
        terms: terms,
        convergence: getConvergenceInfo(seriesName, params)
    };
}

/**
 * Get convergence information for a series
 */
function getConvergenceInfo(seriesName, params) {
    const info = {
        geometric: params.r !== undefined && Math.abs(params.r) < 1
            ? `Converges to ${1 / (1 - params.r)}`
            : 'Diverges for |r| >= 1',
        exponential: `Converges to e^${params.x} = ${Math.exp(params.x)}`,
        sine: `Converges to sin(${params.x}) = ${Math.sin(params.x)}`,
        cosine: `Converges to cos(${params.x}) = ${Math.cos(params.x)}`,
        logarithm: Math.abs(params.x) <= 1 && params.x !== -1
            ? `Converges to ln(1+${params.x}) = ${Math.log(1 + params.x)}`
            : 'Converges only for -1 < x <= 1',
        arctan: Math.abs(params.x) <= 1
            ? `Converges to arctan(${params.x}) = ${Math.atan(params.x)}`
            : 'Converges only for |x| <= 1',
        basel: `Converges to π²/6 = ${Math.PI * Math.PI / 6}`,
        leibniz: `Converges to π/4 = ${Math.PI / 4}`,
        zeta: params.s > 1 ? `Converges (ζ(${params.s}))` : 'Diverges for s <= 1',
        fibonacciReciprocal: 'Converges (reciprocal Fibonacci constant)'
    };

    return info[seriesName] || 'Unknown convergence';
}

/**
 * Evaluate custom series expression
 * WARNING: Uses eval - only for demonstration purposes
 *
 * @param {string} expression - Series term formula (use 'k' as variable)
 * @param {number} n - Number of terms
 * @param {number} startIndex - Starting index
 * @returns {object} Result with sum and terms
 */
function evaluateCustomSeries(expression, n, startIndex = 1) {
    let sum = 0;
    let c = 0;
    const terms = [];

    // Create safe evaluation function
    const safeEval = (k) => {
        try {
            // Replace common math functions
            const expr = expression
                .replace(/\bsin\b/g, 'Math.sin')
                .replace(/\bcos\b/g, 'Math.cos')
                .replace(/\btan\b/g, 'Math.tan')
                .replace(/\bexp\b/g, 'Math.exp')
                .replace(/\blog\b/g, 'Math.log')
                .replace(/\bsqrt\b/g, 'Math.sqrt')
                .replace(/\babs\b/g, 'Math.abs')
                .replace(/\bpow\b/g, 'Math.pow')
                .replace(/\bPI\b/g, 'Math.PI')
                .replace(/\bE\b/g, 'Math.E');

            return eval(expr);
        } catch (e) {
            return NaN;
        }
    };

    for (let k = startIndex; k <= n; k++) {
        const term = safeEval(k);

        if (!isFinite(term)) {
            throw new Error(`Invalid term at k=${k}`);
        }

        const y = term - c;
        const t = sum + y;
        c = (t - sum) - y;
        sum = t;

        if (k <= startIndex + 15 || k === n) {
            terms.push({ k, term: term.toExponential(6), partialSum: sum.toFixed(12) });
        }

        if (k % 10000 === 0 || k === n) {
            self.postMessage({
                type: 'progress',
                current: k - startIndex,
                total: n - startIndex,
                percentage: Math.round(((k - startIndex) / (n - startIndex)) * 100)
            });
        }
    }

    return {
        sum: sum.toFixed(15),
        terms: terms,
        convergence: 'Custom series - check convergence manually'
    };
}

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, seriesName, expression, n, params, startIndex } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'predefined':
                result = calculateSeries(seriesName, n, params || {}, startIndex || 0);
                break;

            case 'custom':
                result = evaluateCustomSeries(expression, n, startIndex || 1);
                break;

            case 'list':
                result = Object.keys(SERIES);
                break;

            default:
                throw new Error(`Unknown calculation type: ${type}`);
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            calculationType: type,
            seriesName: seriesName,
            expression: expression,
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
