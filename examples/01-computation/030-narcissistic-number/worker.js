/**
 * Web Worker: Narcissistic Number Search
 *
 * A narcissistic number (also called Armstrong number or PPDI)
 * equals the sum of its digits each raised to the power of k,
 * where k can be any positive integer (not necessarily digit count).
 */

self.onmessage = function(e) {
    const { type } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'searchByPower':
                result = searchByPower(e.data.power, e.data.maxDigits || 10);
                break;
            case 'searchAllPowers':
                result = searchAllPowers(e.data.maxNumber || 100000, e.data.maxPower || 10);
                break;
            case 'verify':
                result = verifyNumber(e.data.number, e.data.power);
                break;
            case 'munchausen':
                result = findMunchausen(e.data.maxDigits || 7);
                break;
            case 'perfectDigital':
                result = findPerfectDigitalInvariants(e.data.maxDigits || 6);
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
 * Precompute powers for digits 0-9
 */
function precomputePowers(maxPower) {
    const powers = [];
    for (let d = 0; d <= 9; d++) {
        powers[d] = [];
        let p = 1n;
        for (let exp = 0; exp <= maxPower; exp++) {
            powers[d][exp] = p;
            p *= BigInt(d);
        }
    }
    return powers;
}

/**
 * Search for narcissistic numbers with specific power
 */
function searchByPower(power, maxDigits) {
    const results = [];
    const powers = precomputePowers(power);
    const maxVal = BigInt(10) ** BigInt(maxDigits);

    let checked = 0;
    const checkInterval = 100000;

    for (let n = 0n; n < maxVal; n++) {
        const str = n.toString();
        let sum = 0n;

        for (const c of str) {
            sum += powers[parseInt(c)][power];
            if (sum > n + 1000n) break; // Early termination
        }

        if (sum === n) {
            results.push({
                number: n.toString(),
                digits: str.length,
                power
            });
        }

        checked++;
        if (checked % checkInterval === 0) {
            const progress = Math.floor((Number(n) / Number(maxVal)) * 100);
            self.postMessage({
                type: 'progress',
                current: checked,
                total: Number(maxVal),
                percentage: Math.min(progress, 99)
            });
        }

        // Limit search
        if (checked > 10000000) break;
    }

    return {
        power,
        maxDigits,
        count: results.length,
        numbers: results
    };
}

/**
 * Search for numbers that are narcissistic for ANY power
 */
function searchAllPowers(maxNumber, maxPower) {
    const results = new Map();
    const powers = precomputePowers(maxPower);

    for (let n = 1; n <= maxNumber; n++) {
        const str = n.toString();
        const digits = str.split('').map(Number);

        for (let p = 1; p <= maxPower; p++) {
            let sum = 0;
            for (const d of digits) {
                sum += Number(powers[d][p]);
                if (sum > n) break;
            }

            if (sum === n) {
                if (!results.has(n)) {
                    results.set(n, { number: n, powers: [] });
                }
                results.get(n).powers.push(p);
            }
        }

        if (n % 10000 === 0) {
            self.postMessage({
                type: 'progress',
                current: n,
                total: maxNumber,
                percentage: Math.floor((n / maxNumber) * 100)
            });
        }
    }

    // Convert to array and sort
    const arr = Array.from(results.values()).sort((a, b) => a.number - b.number);

    return {
        maxNumber,
        maxPower,
        count: arr.length,
        numbers: arr
    };
}

/**
 * Verify if a number is narcissistic for given power
 */
function verifyNumber(numStr, power) {
    const n = BigInt(numStr);
    const digits = numStr.split('').map(Number);
    const breakdown = [];
    let sum = 0n;

    for (const d of digits) {
        const val = BigInt(d) ** BigInt(power);
        sum += val;
        breakdown.push({
            digit: d,
            power,
            value: val.toString()
        });
    }

    return {
        number: numStr,
        power,
        digitCount: digits.length,
        sum: sum.toString(),
        isNarcissistic: sum === n,
        breakdown,
        formula: digits.map(d => `${d}^${power}`).join(' + ')
    };
}

/**
 * Find Munchausen numbers
 * A number where sum of digits raised to themselves equals the number
 * Using convention 0^0 = 0
 */
function findMunchausen(maxDigits) {
    const results = [];
    const maxVal = Math.pow(10, maxDigits);

    // Precompute d^d for digits 0-9
    const selfPowers = [0]; // 0^0 = 0 by convention
    for (let d = 1; d <= 9; d++) {
        selfPowers[d] = Math.pow(d, d);
    }

    for (let n = 1; n < maxVal; n++) {
        const str = n.toString();
        let sum = 0;

        for (const c of str) {
            sum += selfPowers[parseInt(c)];
            if (sum > n) break;
        }

        if (sum === n) {
            const breakdown = str.split('').map(c => {
                const d = parseInt(c);
                return { digit: d, value: selfPowers[d] };
            });

            results.push({
                number: n,
                breakdown,
                formula: str.split('').map(c => `${c}^${c}`).join(' + ')
            });
        }

        if (n % 100000 === 0) {
            self.postMessage({
                type: 'progress',
                current: n,
                total: maxVal,
                percentage: Math.floor((n / maxVal) * 100)
            });
        }
    }

    return {
        maxDigits,
        count: results.length,
        numbers: results,
        note: 'Using convention 0^0 = 0'
    };
}

/**
 * Find Perfect Digital Invariants (PDI)
 * Numbers equal to sum of k-th powers of digits for some fixed k
 */
function findPerfectDigitalInvariants(maxDigits) {
    const results = new Map();
    const maxVal = Math.pow(10, maxDigits);
    const maxPower = maxDigits + 5;

    // Precompute powers
    const powers = [];
    for (let d = 0; d <= 9; d++) {
        powers[d] = [1];
        for (let p = 1; p <= maxPower; p++) {
            powers[d][p] = powers[d][p - 1] * d;
        }
    }

    for (let n = 1; n < maxVal; n++) {
        const str = n.toString();
        const digits = str.split('').map(Number);
        const numDigits = digits.length;

        for (let p = 1; p <= maxPower; p++) {
            // Skip if this is an Armstrong number (p equals digit count)
            // We want PDIs where p differs from digit count
            if (p === numDigits) continue;

            let sum = 0;
            for (const d of digits) {
                sum += powers[d][p];
                if (sum > n) break;
            }

            if (sum === n) {
                const key = `${n}-${p}`;
                results.set(key, {
                    number: n,
                    power: p,
                    digitCount: numDigits,
                    type: p < numDigits ? 'sub-Armstrong' : 'super-Armstrong'
                });
            }
        }

        if (n % 100000 === 0) {
            self.postMessage({
                type: 'progress',
                current: n,
                total: maxVal,
                percentage: Math.floor((n / maxVal) * 100)
            });
        }
    }

    const arr = Array.from(results.values()).sort((a, b) => {
        if (a.number !== b.number) return a.number - b.number;
        return a.power - b.power;
    });

    return {
        maxDigits,
        count: arr.length,
        numbers: arr
    };
}
