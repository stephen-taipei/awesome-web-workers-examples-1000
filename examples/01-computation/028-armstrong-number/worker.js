/**
 * Web Worker: Armstrong Number (Narcissistic Number) Calculator
 *
 * An Armstrong number is a number equal to the sum of its own digits
 * each raised to the power of the number of digits.
 * Example: 153 = 1³ + 5³ + 3³
 */

self.onmessage = function(e) {
    const { type } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'check':
                result = checkNumber(e.data.number);
                break;
            case 'findByDigits':
                result = findByDigits(e.data.digits);
                break;
            case 'findInRange':
                result = findInRange(e.data.start, e.data.end);
                break;
            case 'allKnown':
                result = findAllKnown(e.data.maxDigits || 10);
                break;
            case 'pluperfect':
                result = findPluperfect(e.data.maxDigits || 6);
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
 * Precompute powers for efficiency
 */
function precomputePowers(maxDigits) {
    const powers = [];
    for (let d = 0; d <= 9; d++) {
        powers[d] = [];
        let p = 1n;
        for (let exp = 0; exp <= maxDigits; exp++) {
            powers[d][exp] = p;
            p *= BigInt(d);
        }
    }
    return powers;
}

/**
 * Check if a number is an Armstrong number
 */
function checkNumber(numStr) {
    const n = BigInt(numStr);
    const digits = numStr.split('').map(Number);
    const numDigits = digits.length;

    // Calculate sum of digits^numDigits
    let sum = 0n;
    const breakdown = [];

    for (const d of digits) {
        const power = BigInt(d) ** BigInt(numDigits);
        sum += power;
        breakdown.push({
            digit: d,
            power: numDigits,
            value: power.toString()
        });
    }

    return {
        number: numStr,
        numDigits,
        digitPowerSum: sum.toString(),
        isArmstrong: sum === n,
        breakdown,
        formula: digits.map(d => `${d}^${numDigits}`).join(' + ')
    };
}

/**
 * Find all Armstrong numbers with specific digit count
 */
function findByDigits(digits) {
    const armstrongs = [];
    const powers = precomputePowers(digits);

    const start = digits === 1 ? 0n : BigInt(10) ** BigInt(digits - 1);
    const end = BigInt(10) ** BigInt(digits);
    const total = Number(end - start);

    let count = 0;
    let lastProgress = 0;

    // Optimized search using digit combinations
    if (digits <= 7) {
        // Direct iteration for smaller digit counts
        for (let n = start; n < end; n++) {
            const str = n.toString();
            let sum = 0n;

            for (const c of str) {
                sum += powers[parseInt(c)][digits];
            }

            if (sum === n) {
                armstrongs.push(n.toString());
            }

            count++;
            const progress = Math.floor((count / total) * 100);
            if (progress > lastProgress && progress % 2 === 0) {
                lastProgress = progress;
                self.postMessage({
                    type: 'progress',
                    current: count,
                    total,
                    percentage: progress
                });
            }
        }
    } else {
        // Use combinatorial search for larger digit counts
        armstrongs.push(...findByCombination(digits, powers));
    }

    return {
        digits,
        count: armstrongs.length,
        numbers: armstrongs,
        range: { start: start.toString(), end: (end - 1n).toString() }
    };
}

/**
 * Find Armstrong numbers using digit combination enumeration
 */
function findByCombination(numDigits, powers) {
    const results = [];
    const minVal = numDigits === 1 ? 0n : BigInt(10) ** BigInt(numDigits - 1);
    const maxVal = BigInt(10) ** BigInt(numDigits) - 1n;

    // Generate all combinations of digits with repetition
    function* combinations(remaining, minDigit, current) {
        if (remaining === 0) {
            yield current;
            return;
        }

        for (let d = minDigit; d <= 9; d++) {
            yield* combinations(remaining - 1, d, [...current, d]);
        }
    }

    let checked = 0;
    const totalCombinations = binomial(numDigits + 9, 9);

    for (const combo of combinations(numDigits, 0, [])) {
        checked++;

        // Calculate sum
        let sum = 0n;
        for (const d of combo) {
            sum += powers[d][numDigits];
        }

        // Check if sum has correct digits
        if (sum >= minVal && sum <= maxVal) {
            const sumStr = sum.toString();
            if (sumStr.length === numDigits) {
                // Verify digits match
                const sumDigits = sumStr.split('').map(Number).sort((a, b) => a - b);
                const comboSorted = [...combo].sort((a, b) => a - b);

                if (sumDigits.every((d, i) => d === comboSorted[i])) {
                    results.push(sum.toString());
                }
            }
        }

        if (checked % 10000 === 0) {
            self.postMessage({
                type: 'progress',
                current: checked,
                total: totalCombinations,
                percentage: Math.floor((checked / totalCombinations) * 100)
            });
        }
    }

    return results.sort((a, b) => BigInt(a) < BigInt(b) ? -1 : 1);
}

/**
 * Calculate binomial coefficient
 */
function binomial(n, k) {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;

    let result = 1;
    for (let i = 0; i < k; i++) {
        result = result * (n - i) / (i + 1);
    }
    return Math.floor(result);
}

/**
 * Find Armstrong numbers in a range
 */
function findInRange(start, end) {
    const startN = BigInt(start);
    const endN = BigInt(end);
    const armstrongs = [];
    const total = Number(endN - startN) + 1;

    let count = 0;
    let lastProgress = 0;

    for (let n = startN; n <= endN; n++) {
        const str = n.toString();
        const numDigits = str.length;
        let sum = 0n;

        for (const c of str) {
            sum += BigInt(parseInt(c)) ** BigInt(numDigits);
        }

        if (sum === n) {
            armstrongs.push({
                number: n.toString(),
                digits: numDigits
            });
        }

        count++;
        const progress = Math.floor((count / total) * 100);
        if (progress > lastProgress) {
            lastProgress = progress;
            self.postMessage({
                type: 'progress',
                current: count,
                total,
                percentage: progress
            });
        }
    }

    return {
        range: { start, end },
        total,
        count: armstrongs.length,
        numbers: armstrongs
    };
}

/**
 * Find all known Armstrong numbers up to given digits
 */
function findAllKnown(maxDigits) {
    const allArmstrongs = [];

    for (let d = 1; d <= maxDigits; d++) {
        self.postMessage({
            type: 'progress',
            current: d,
            total: maxDigits,
            percentage: Math.floor((d / maxDigits) * 100)
        });

        const powers = precomputePowers(d);
        const found = d <= 7 ? findByDigitsDirect(d, powers) : findByCombination(d, powers);

        for (const num of found) {
            allArmstrongs.push({
                number: num,
                digits: d
            });
        }
    }

    return {
        maxDigits,
        totalCount: allArmstrongs.length,
        numbers: allArmstrongs,
        byDigits: groupByDigits(allArmstrongs)
    };
}

/**
 * Direct search for Armstrong numbers
 */
function findByDigitsDirect(digits, powers) {
    const results = [];
    const start = digits === 1 ? 0n : BigInt(10) ** BigInt(digits - 1);
    const end = BigInt(10) ** BigInt(digits);

    for (let n = start; n < end; n++) {
        const str = n.toString();
        let sum = 0n;

        for (const c of str) {
            sum += powers[parseInt(c)][digits];
        }

        if (sum === n) {
            results.push(n.toString());
        }
    }

    return results;
}

/**
 * Group Armstrong numbers by digit count
 */
function groupByDigits(numbers) {
    const groups = {};
    for (const item of numbers) {
        if (!groups[item.digits]) {
            groups[item.digits] = [];
        }
        groups[item.digits].push(item.number);
    }
    return groups;
}

/**
 * Find pluperfect digital invariants (PPDI)
 * Numbers where sum of k-th powers of digits equals the number for some k
 */
function findPluperfect(maxDigits) {
    const results = [];
    const max = BigInt(10) ** BigInt(maxDigits);

    let checked = 0;
    const total = Number(max);

    for (let n = 1n; n < max; n++) {
        const str = n.toString();
        const digits = str.split('').map(Number);

        // Try different powers
        for (let k = 1; k <= maxDigits + 5; k++) {
            let sum = 0n;
            for (const d of digits) {
                sum += BigInt(d) ** BigInt(k);
                if (sum > n) break;
            }

            if (sum === n && k !== str.length) {
                results.push({
                    number: n.toString(),
                    power: k,
                    numDigits: str.length
                });
                break;
            }
        }

        checked++;
        if (checked % 100000 === 0) {
            self.postMessage({
                type: 'progress',
                current: checked,
                total: Math.min(total, 10000000),
                percentage: Math.floor((checked / Math.min(total, 10000000)) * 100)
            });
        }

        if (checked > 10000000) break;
    }

    return {
        maxDigits,
        count: results.length,
        numbers: results
    };
}
