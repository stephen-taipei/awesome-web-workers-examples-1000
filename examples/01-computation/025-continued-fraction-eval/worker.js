/**
 * Web Worker: Continued Fraction Evaluation
 *
 * Evaluates continued fractions to high precision.
 * Supports standard CF [a0; a1, a2, ...] and generalized CF.
 */

/**
 * Evaluate standard continued fraction [a0; a1, a2, ...]
 * Using bottom-up evaluation
 * @param {Array<number>} cf - Coefficients
 * @returns {number} Decimal value
 */
function evaluateCF(cf) {
    if (cf.length === 0) return 0;
    if (cf.length === 1) return cf[0];

    let result = cf[cf.length - 1];
    for (let i = cf.length - 2; i >= 0; i--) {
        result = cf[i] + 1 / result;

        if (i % 100 === 0) {
            self.postMessage({
                type: 'progress',
                current: cf.length - i,
                total: cf.length,
                percentage: Math.round(((cf.length - i) / cf.length) * 100)
            });
        }
    }

    return result;
}

/**
 * Evaluate CF using convergents (forward method) with BigInt for exact rationals
 * @param {Array<number>} cf - Coefficients
 * @returns {{p: bigint, q: bigint, decimal: number}} Final convergent
 */
function evaluateCFExact(cf) {
    if (cf.length === 0) return { p: 0n, q: 1n, decimal: 0 };

    let p_prev = 1n, p_curr = BigInt(Math.floor(cf[0]));
    let q_prev = 0n, q_curr = 1n;

    for (let i = 1; i < cf.length; i++) {
        const a = BigInt(Math.floor(cf[i]));
        const p_new = a * p_curr + p_prev;
        const q_new = a * q_curr + q_prev;

        p_prev = p_curr;
        p_curr = p_new;
        q_prev = q_curr;
        q_curr = q_new;

        if (i % 100 === 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: cf.length,
                percentage: Math.round((i / cf.length) * 100)
            });
        }
    }

    return {
        p: p_curr,
        q: q_curr,
        decimal: Number(p_curr) / Number(q_curr)
    };
}

/**
 * Evaluate generalized continued fraction
 * b0 + a1/(b1 + a2/(b2 + a3/(b3 + ...)))
 * @param {Array<number>} a - Numerator coefficients [a1, a2, ...]
 * @param {Array<number>} b - Denominator coefficients [b0, b1, b2, ...]
 * @returns {number} Value
 */
function evaluateGeneralizedCF(a, b) {
    const n = Math.min(a.length, b.length - 1);
    if (n <= 0) return b[0] || 0;

    let result = b[n];
    for (let i = n - 1; i >= 0; i--) {
        result = b[i] + a[i] / result;

        if (i % 50 === 0) {
            self.postMessage({
                type: 'progress',
                current: n - i,
                total: n,
                percentage: Math.round(((n - i) / n) * 100)
            });
        }
    }

    return result;
}

/**
 * Generate and evaluate periodic continued fraction [a0; period repeated n times]
 * @param {number} a0 - First coefficient
 * @param {Array<number>} period - Repeating period
 * @param {number} repetitions - Number of times to repeat period
 * @returns {object} Value and convergence info
 */
function evaluatePeriodicCF(a0, period, repetitions) {
    const cf = [a0];
    for (let i = 0; i < repetitions; i++) {
        cf.push(...period);
    }

    const values = [];
    for (let len = 1; len <= cf.length; len += Math.max(1, Math.floor(cf.length / 20))) {
        values.push({
            terms: len,
            value: evaluateCF(cf.slice(0, len))
        });
    }
    values.push({ terms: cf.length, value: evaluateCF(cf) });

    return {
        cf: cf.slice(0, 30),
        totalTerms: cf.length,
        finalValue: evaluateCF(cf),
        convergence: values
    };
}

/**
 * Famous continued fraction formulas
 */
const FAMOUS_CF = {
    // e = 2 + 1/(1 + 1/(2 + 2/(3 + 3/(4 + ...))))
    // Generalized: b=[2,1,2,3,4,...], a=[1,1,2,3,4,...]
    'e': (terms) => {
        const a = [1];
        const b = [2, 1];
        for (let i = 2; i <= terms; i++) {
            a.push(i - 1);
            b.push(i);
        }
        return { a, b, trueValue: Math.E };
    },

    // pi/4 = 1/(1 + 1²/(2 + 3²/(2 + 5²/(2 + ...))))
    // Generalized CF for arctan(1)
    'pi4': (terms) => {
        const a = [];
        const b = [0];
        for (let i = 0; i < terms; i++) {
            a.push(i === 0 ? 1 : (2 * i - 1) ** 2);
            b.push(i === 0 ? 1 : 2);
        }
        return { a, b, trueValue: Math.PI / 4 };
    },

    // sqrt(2) = 1 + 1/(2 + 1/(2 + 1/(2 + ...)))
    'sqrt2': (terms) => {
        const cf = [1];
        for (let i = 1; i < terms; i++) cf.push(2);
        return { cf, trueValue: Math.SQRT2 };
    },

    // Golden ratio = 1 + 1/(1 + 1/(1 + ...))
    'phi': (terms) => {
        const cf = Array(terms).fill(1);
        return { cf, trueValue: (1 + Math.sqrt(5)) / 2 };
    },

    // sqrt(N) for any N
    'sqrtN': (N, terms) => {
        const a0 = Math.floor(Math.sqrt(N));
        if (a0 * a0 === N) return { cf: [a0], trueValue: a0 };

        // Find periodic part
        const cf = [a0];
        let m = 0, d = 1, a = a0;
        const seen = new Map();

        while (cf.length < terms) {
            m = d * a - m;
            d = (N - m * m) / d;
            a = Math.floor((a0 + m) / d);

            const key = `${m},${d}`;
            if (seen.has(key) && cf.length > 10) break;
            seen.set(key, cf.length);

            cf.push(a);
        }

        return { cf, trueValue: Math.sqrt(N) };
    }
};

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, cf, a, b, a0, period, repetitions, formula, terms, N } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'standard':
                const exact = evaluateCFExact(cf);
                result = {
                    value: evaluateCF(cf),
                    exact: { p: exact.p.toString(), q: exact.q.toString() },
                    terms: cf.length
                };
                break;

            case 'generalized':
                result = {
                    value: evaluateGeneralizedCF(a, b),
                    terms: Math.min(a.length, b.length)
                };
                break;

            case 'periodic':
                result = evaluatePeriodicCF(a0, period, repetitions);
                break;

            case 'famous':
                const famousCF = FAMOUS_CF[formula];
                if (!famousCF) throw new Error(`Unknown formula: ${formula}`);

                const data = formula === 'sqrtN' ? famousCF(N, terms) : famousCF(terms);

                if (data.cf) {
                    result = {
                        cf: data.cf.slice(0, 30),
                        value: evaluateCF(data.cf),
                        trueValue: data.trueValue,
                        error: Math.abs(evaluateCF(data.cf) - data.trueValue)
                    };
                } else {
                    result = {
                        value: evaluateGeneralizedCF(data.a, data.b),
                        trueValue: data.trueValue,
                        error: Math.abs(evaluateGeneralizedCF(data.a, data.b) - data.trueValue)
                    };
                }
                break;

            default:
                throw new Error(`Unknown type: ${type}`);
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            calculationType: type,
            result: result,
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};
