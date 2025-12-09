/**
 * Web Worker: Continued Fraction Expansion
 *
 * Converts numbers to their continued fraction representation.
 * A continued fraction is: a0 + 1/(a1 + 1/(a2 + 1/(a3 + ...)))
 * Written as [a0; a1, a2, a3, ...]
 */

/**
 * Convert a rational number p/q to continued fraction
 * @param {bigint} p - Numerator
 * @param {bigint} q - Denominator
 * @param {number} maxTerms - Maximum terms to compute
 * @returns {Array<string>} Continued fraction coefficients
 */
function rationalToCF(p, q, maxTerms = 100) {
    const cf = [];

    while (q !== 0n && cf.length < maxTerms) {
        const a = p / q;
        cf.push(a.toString());

        const remainder = p % q;
        p = q;
        q = remainder;

        if (cf.length % 20 === 0) {
            self.postMessage({
                type: 'progress',
                current: cf.length,
                total: maxTerms,
                percentage: Math.round((cf.length / maxTerms) * 100)
            });
        }
    }

    return cf;
}

/**
 * Convert a decimal number to continued fraction
 * @param {number} x - The decimal number
 * @param {number} maxTerms - Maximum terms
 * @param {number} tolerance - Precision tolerance
 * @returns {Array<number>} Continued fraction coefficients
 */
function decimalToCF(x, maxTerms = 50, tolerance = 1e-10) {
    const cf = [];
    let value = x;

    for (let i = 0; i < maxTerms; i++) {
        const intPart = Math.floor(value);
        cf.push(intPart);

        const fracPart = value - intPart;
        if (Math.abs(fracPart) < tolerance) break;

        value = 1 / fracPart;

        if (i % 10 === 0) {
            self.postMessage({
                type: 'progress',
                current: i + 1,
                total: maxTerms,
                percentage: Math.round(((i + 1) / maxTerms) * 100)
            });
        }
    }

    return cf;
}

/**
 * Get continued fraction for famous constants
 * @param {string} constant - Name of constant
 * @param {number} terms - Number of terms
 * @returns {object} CF representation and info
 */
function getConstantCF(constant, terms) {
    const results = { cf: [], pattern: '', value: 0 };

    switch (constant) {
        case 'sqrt2':
            // sqrt(2) = [1; 2, 2, 2, ...]
            results.cf = [1];
            for (let i = 1; i < terms; i++) results.cf.push(2);
            results.pattern = '[1; 2, 2, 2, ...] (periodic)';
            results.value = Math.SQRT2;
            break;

        case 'sqrt3':
            // sqrt(3) = [1; 1, 2, 1, 2, ...]
            results.cf = [1];
            for (let i = 1; i < terms; i++) results.cf.push(i % 2 === 1 ? 1 : 2);
            results.pattern = '[1; 1, 2, 1, 2, ...] (periodic)';
            results.value = Math.sqrt(3);
            break;

        case 'sqrt5':
            // sqrt(5) = [2; 4, 4, 4, ...]
            results.cf = [2];
            for (let i = 1; i < terms; i++) results.cf.push(4);
            results.pattern = '[2; 4, 4, 4, ...] (periodic)';
            results.value = Math.sqrt(5);
            break;

        case 'phi':
            // Golden ratio = [1; 1, 1, 1, ...]
            results.cf = Array(terms).fill(1);
            results.pattern = '[1; 1, 1, 1, ...] (all ones)';
            results.value = (1 + Math.sqrt(5)) / 2;
            break;

        case 'e':
            // e = [2; 1, 2, 1, 1, 4, 1, 1, 6, 1, 1, 8, ...]
            results.cf = [2];
            let k = 1;
            for (let i = 1; i < terms; i++) {
                if (i % 3 === 2) {
                    results.cf.push(2 * k);
                    k++;
                } else {
                    results.cf.push(1);
                }
            }
            results.pattern = '[2; 1, 2, 1, 1, 4, 1, 1, 6, ...] (pattern with 2k)';
            results.value = Math.E;
            break;

        case 'pi':
            // Pi has no simple pattern, compute numerically
            results.cf = decimalToCF(Math.PI, terms);
            results.pattern = '[3; 7, 15, 1, 292, 1, 1, ...] (no simple pattern)';
            results.value = Math.PI;
            break;

        default:
            throw new Error(`Unknown constant: ${constant}`);
    }

    self.postMessage({ type: 'progress', current: terms, total: terms, percentage: 100 });
    return results;
}

/**
 * Convert continued fraction back to decimal for verification
 * @param {Array<number>} cf - Continued fraction coefficients
 * @returns {number} Decimal value
 */
function cfToDecimal(cf) {
    if (cf.length === 0) return 0;

    let result = cf[cf.length - 1];
    for (let i = cf.length - 2; i >= 0; i--) {
        result = cf[i] + 1 / result;
    }
    return result;
}

/**
 * Get convergents (rational approximations) from CF
 * @param {Array<number>} cf - Continued fraction
 * @returns {Array<{p: string, q: string, value: string}>} Convergents
 */
function getConvergents(cf) {
    const convergents = [];
    let p_prev = 1n, p_curr = BigInt(cf[0]);
    let q_prev = 0n, q_curr = 1n;

    convergents.push({
        index: 0,
        p: p_curr.toString(),
        q: q_curr.toString(),
        value: Number(p_curr) / Number(q_curr)
    });

    for (let i = 1; i < cf.length; i++) {
        const a = BigInt(cf[i]);
        const p_new = a * p_curr + p_prev;
        const q_new = a * q_curr + q_prev;

        convergents.push({
            index: i,
            p: p_new.toString(),
            q: q_new.toString(),
            value: Number(p_new) / Number(q_new)
        });

        p_prev = p_curr;
        p_curr = p_new;
        q_prev = q_curr;
        q_curr = q_new;
    }

    return convergents;
}

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, value, numerator, denominator, constant, terms, maxTerms } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'decimal':
                const cf = decimalToCF(value, maxTerms || 50);
                const reconstructed = cfToDecimal(cf);
                result = {
                    cf: cf,
                    convergents: getConvergents(cf),
                    original: value,
                    reconstructed: reconstructed,
                    error: Math.abs(value - reconstructed)
                };
                break;

            case 'rational':
                const p = BigInt(numerator);
                const q = BigInt(denominator);
                const cfRat = rationalToCF(p, q, maxTerms || 100);
                result = {
                    cf: cfRat,
                    convergents: getConvergents(cfRat.map(Number)),
                    fraction: `${numerator}/${denominator}`
                };
                break;

            case 'constant':
                const constResult = getConstantCF(constant, terms || 30);
                result = {
                    cf: constResult.cf,
                    pattern: constResult.pattern,
                    convergents: getConvergents(constResult.cf),
                    trueValue: constResult.value
                };
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
