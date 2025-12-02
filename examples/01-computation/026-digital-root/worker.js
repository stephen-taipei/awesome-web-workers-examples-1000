/**
 * Web Worker: Digital Root Calculator
 *
 * Computes digital roots and related digit-based calculations.
 * Digital root is obtained by repeatedly summing digits until single digit.
 */

/**
 * Calculate digital root of a number
 * @param {string} numStr - Number as string (supports very large numbers)
 * @returns {object} Digital root and computation steps
 */
function calculateDigitalRoot(numStr) {
    const steps = [];
    let current = numStr.replace(/^0+/, '') || '0';

    steps.push({ value: current, digitSum: null });

    while (current.length > 1) {
        let sum = 0n;
        for (const digit of current) {
            sum += BigInt(digit);
        }
        current = sum.toString();
        steps.push({ value: current, digitSum: current });
    }

    // Mathematical formula: dr(n) = 1 + ((n-1) mod 9) for n > 0
    // Or dr(n) = n mod 9, where 0 maps to 9 for n > 0

    return {
        digitalRoot: parseInt(current),
        steps: steps,
        stepCount: steps.length - 1
    };
}

/**
 * Calculate digital root using the direct formula (mod 9)
 * @param {string} numStr - Number as string
 * @returns {number} Digital root
 */
function digitalRootFormula(numStr) {
    if (numStr === '0') return 0;

    // For very large numbers, sum digits first to get a manageable number
    let sum = 0n;
    for (const digit of numStr) {
        sum += BigInt(digit);
    }

    // Apply mod 9 rule
    const mod = Number(sum % 9n);
    return mod === 0 ? 9 : mod;
}

/**
 * Find all numbers up to n with a specific digital root
 * @param {number} n - Upper limit
 * @param {number} targetRoot - Target digital root (1-9)
 * @returns {Array<number>} Numbers with that digital root
 */
function findNumbersWithRoot(n, targetRoot) {
    const results = [];

    for (let i = targetRoot; i <= n; i += 9) {
        if (i === 0 && targetRoot !== 0) continue;
        results.push(i);

        if (results.length % 1000 === 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.round((i / n) * 100)
            });
        }
    }

    // Handle special case for 0
    if (targetRoot === 0) {
        return [0];
    }

    return results;
}

/**
 * Calculate digit sum (single iteration)
 * @param {string} numStr - Number as string
 * @returns {bigint} Sum of digits
 */
function digitSum(numStr) {
    let sum = 0n;
    for (const digit of numStr) {
        sum += BigInt(digit);
    }
    return sum;
}

/**
 * Calculate multiplicative digital root
 * Repeatedly multiply digits until single digit
 * @param {string} numStr - Number as string
 * @returns {object} Result and steps
 */
function multiplicativeDigitalRoot(numStr) {
    const steps = [];
    let current = numStr.replace(/^0+/, '') || '0';

    steps.push({ value: current, product: null });

    // If any digit is 0, result is 0
    if (current.includes('0') && current.length > 1) {
        return {
            multiplicativeRoot: 0,
            steps: [...steps, { value: '0', product: '0' }],
            stepCount: 1
        };
    }

    while (current.length > 1) {
        let product = 1n;
        for (const digit of current) {
            product *= BigInt(digit);
        }
        current = product.toString();
        steps.push({ value: current, product: current });

        if (current.includes('0')) {
            return {
                multiplicativeRoot: 0,
                steps: steps,
                stepCount: steps.length - 1
            };
        }
    }

    return {
        multiplicativeRoot: parseInt(current),
        steps: steps,
        stepCount: steps.length - 1
    };
}

/**
 * Calculate additive persistence (number of steps to reach digital root)
 * @param {string} numStr - Number as string
 * @returns {number} Additive persistence
 */
function additivePersistence(numStr) {
    let current = numStr;
    let count = 0;

    while (current.length > 1) {
        let sum = 0n;
        for (const digit of current) {
            sum += BigInt(digit);
        }
        current = sum.toString();
        count++;
    }

    return count;
}

/**
 * Calculate multiplicative persistence
 * @param {string} numStr - Number as string
 * @returns {number} Multiplicative persistence
 */
function multiplicativePersistence(numStr) {
    let current = numStr;
    let count = 0;

    while (current.length > 1) {
        let product = 1n;
        for (const digit of current) {
            product *= BigInt(digit);
        }
        current = product.toString();
        count++;
    }

    return count;
}

/**
 * Find numbers with high multiplicative persistence
 * @param {number} maxDigits - Maximum number of digits to search
 * @param {number} minPersistence - Minimum persistence to report
 * @returns {Array} Numbers with high persistence
 */
function findHighPersistence(maxDigits, minPersistence) {
    const results = [];

    // Known high persistence numbers (searching is very slow)
    const known = [
        { n: '0', persistence: 0 },
        { n: '10', persistence: 1 },
        { n: '25', persistence: 2 },
        { n: '39', persistence: 3 },
        { n: '77', persistence: 4 },
        { n: '679', persistence: 5 },
        { n: '6788', persistence: 6 },
        { n: '68889', persistence: 7 },
        { n: '2677889', persistence: 8 },
        { n: '26888999', persistence: 9 },
        { n: '3778888999', persistence: 10 },
        { n: '277777788888899', persistence: 11 }
    ];

    return known.filter(k => k.persistence >= minPersistence);
}

/**
 * Batch calculate digital roots for a range
 * @param {number} start - Start of range
 * @param {number} end - End of range
 * @returns {object} Distribution and list
 */
function batchDigitalRoots(start, end) {
    const distribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    const samples = [];

    for (let i = start; i <= end; i++) {
        const dr = digitalRootFormula(i.toString());
        distribution[dr]++;

        if (samples.length < 100) {
            samples.push({ n: i, digitalRoot: dr });
        }

        if (i % 10000 === 0) {
            self.postMessage({
                type: 'progress',
                current: i - start,
                total: end - start,
                percentage: Math.round(((i - start) / (end - start)) * 100)
            });
        }
    }

    return { distribution, samples, total: end - start + 1 };
}

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, number, start, end, targetRoot, maxDigits, minPersistence } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'single':
                result = calculateDigitalRoot(number);
                result.formula = digitalRootFormula(number);
                break;

            case 'multiplicative':
                result = multiplicativeDigitalRoot(number);
                break;

            case 'persistence':
                result = {
                    additive: additivePersistence(number),
                    multiplicative: multiplicativePersistence(number),
                    additiveRoot: calculateDigitalRoot(number).digitalRoot,
                    multiplicativeRoot: multiplicativeDigitalRoot(number).multiplicativeRoot
                };
                break;

            case 'batch':
                result = batchDigitalRoots(start, end);
                break;

            case 'findByRoot':
                result = {
                    numbers: findNumbersWithRoot(end, targetRoot),
                    targetRoot: targetRoot
                };
                break;

            case 'highPersistence':
                result = findHighPersistence(maxDigits, minPersistence);
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
