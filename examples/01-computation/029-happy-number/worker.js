/**
 * Web Worker: Happy Number Detection
 *
 * A happy number reaches 1 when repeatedly replacing with the sum of squares of digits.
 * Unhappy numbers enter a cycle that doesn't include 1.
 * Example: 19 → 82 → 68 → 100 → 1 (happy)
 */

self.onmessage = function(e) {
    const { type } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'check':
                result = checkNumber(e.data.number, e.data.power || 2);
                break;
            case 'findInRange':
                result = findInRange(e.data.start, e.data.end, e.data.power || 2);
                break;
            case 'sequence':
                result = generateSequence(e.data.number, e.data.power || 2);
                break;
            case 'statistics':
                result = calculateStatistics(e.data.start, e.data.end);
                break;
            case 'cycles':
                result = findCycles(e.data.power || 2, e.data.maxSearch || 1000);
                break;
            case 'happyBases':
                result = checkHappyBases(e.data.number, e.data.maxBase || 16);
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
 * Calculate sum of digit powers
 */
function digitPowerSum(n, power) {
    let sum = 0n;
    const bigPower = BigInt(power);

    while (n > 0n) {
        const digit = n % 10n;
        sum += digit ** bigPower;
        n = n / 10n;
    }

    return sum;
}

/**
 * Check if a number is happy (reaches 1)
 */
function isHappy(n, power = 2, maxIterations = 1000) {
    const seen = new Set();
    let current = BigInt(n);
    let iterations = 0;

    while (current !== 1n && iterations < maxIterations) {
        if (seen.has(current.toString())) {
            return { isHappy: false, cycle: true, iterations };
        }
        seen.add(current.toString());
        current = digitPowerSum(current, power);
        iterations++;
    }

    return { isHappy: current === 1n, cycle: false, iterations };
}

/**
 * Check single number with detailed path
 */
function checkNumber(numStr, power) {
    const n = BigInt(numStr);
    const path = [n.toString()];
    const seen = new Set([n.toString()]);
    let current = n;
    let cycleStart = -1;

    while (current !== 1n && path.length < 500) {
        current = digitPowerSum(current, power);
        const currentStr = current.toString();

        if (seen.has(currentStr)) {
            cycleStart = path.indexOf(currentStr);
            break;
        }

        seen.add(currentStr);
        path.push(currentStr);
    }

    if (current === 1n && path[path.length - 1] !== '1') {
        path.push('1');
    }

    const isHappyNum = current === 1n;

    return {
        number: numStr,
        power,
        isHappy: isHappyNum,
        steps: path.length - 1,
        path: path.slice(0, 50),
        pathTruncated: path.length > 50,
        cycleStart: cycleStart >= 0 ? cycleStart : null,
        cycleLength: cycleStart >= 0 ? path.length - cycleStart : null
    };
}

/**
 * Find all happy numbers in range
 */
function findInRange(start, end, power) {
    const startN = BigInt(start);
    const endN = BigInt(end);
    const happy = [];
    const unhappy = [];
    const total = Number(endN - startN) + 1;

    let count = 0;
    let lastProgress = 0;

    for (let n = startN; n <= endN; n++) {
        const result = isHappy(n, power);

        if (result.isHappy) {
            happy.push({
                number: n.toString(),
                steps: result.iterations
            });
        } else if (unhappy.length < 100) {
            unhappy.push({
                number: n.toString(),
                steps: result.iterations
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
        power,
        total,
        happyCount: happy.length,
        unhappyCount: total - happy.length,
        density: ((happy.length / total) * 100).toFixed(4),
        happy: happy.slice(0, 200),
        unhappySample: unhappy.slice(0, 20)
    };
}

/**
 * Generate the complete sequence for a number
 */
function generateSequence(numStr, power) {
    const n = BigInt(numStr);
    const sequence = [{ value: n.toString(), sum: null }];
    const seen = new Set([n.toString()]);
    let current = n;
    let cycleStart = -1;

    while (current !== 1n && sequence.length < 500) {
        const next = digitPowerSum(current, power);
        const nextStr = next.toString();

        // Build the sum expression
        const digits = current.toString().split('');
        const sumExpr = digits.map(d => `${d}^${power}`).join(' + ');

        if (seen.has(nextStr)) {
            cycleStart = sequence.findIndex(s => s.value === nextStr);
            sequence.push({ value: nextStr, sum: sumExpr, cycleBack: true });
            break;
        }

        seen.add(nextStr);
        sequence.push({ value: nextStr, sum: sumExpr });
        current = next;
    }

    // Add final step to 1 if happy
    if (current === 1n && sequence[sequence.length - 1].value !== '1') {
        const digits = sequence[sequence.length - 1].value.split('');
        const sumExpr = digits.map(d => `${d}^${power}`).join(' + ');
        sequence.push({ value: '1', sum: sumExpr });
    }

    return {
        number: numStr,
        power,
        isHappy: current === 1n || sequence.some(s => s.value === '1'),
        length: sequence.length,
        sequence: sequence.slice(0, 100),
        truncated: sequence.length > 100,
        cycleStart,
        cycleLength: cycleStart >= 0 ? sequence.length - 1 - cycleStart : null
    };
}

/**
 * Calculate statistics for a range
 */
function calculateStatistics(start, end) {
    const startN = BigInt(start);
    const endN = BigInt(end);
    const total = Number(endN - startN) + 1;

    let happyCount = 0;
    const stepDistribution = {};
    let maxSteps = 0;
    let maxStepsNumber = '';

    let count = 0;
    let lastProgress = 0;

    for (let n = startN; n <= endN; n++) {
        const result = isHappy(n, 2);

        if (result.isHappy) {
            happyCount++;
            const steps = result.iterations;
            stepDistribution[steps] = (stepDistribution[steps] || 0) + 1;

            if (steps > maxSteps) {
                maxSteps = steps;
                maxStepsNumber = n.toString();
            }
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

    // Format step distribution
    const distribution = Object.entries(stepDistribution)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .map(([steps, count]) => ({ steps: parseInt(steps), count }));

    return {
        range: { start, end },
        total,
        happyCount,
        unhappyCount: total - happyCount,
        happyDensity: ((happyCount / total) * 100).toFixed(4),
        maxSteps,
        maxStepsNumber,
        stepDistribution: distribution
    };
}

/**
 * Find cycles for unhappy numbers
 */
function findCycles(power, maxSearch) {
    const cycles = new Map();

    for (let n = 1; n <= maxSearch; n++) {
        const path = [];
        const seen = new Map();
        let current = BigInt(n);

        while (current !== 1n && path.length < 500) {
            const currentStr = current.toString();

            if (seen.has(currentStr)) {
                // Found a cycle
                const cycleStartIdx = seen.get(currentStr);
                const cycle = path.slice(cycleStartIdx);
                const cycleKey = [...cycle].sort((a, b) =>
                    BigInt(a) < BigInt(b) ? -1 : 1
                ).join(',');

                if (!cycles.has(cycleKey)) {
                    cycles.set(cycleKey, {
                        cycle,
                        length: cycle.length,
                        sum: cycle.reduce((s, v) => s + BigInt(v), 0n).toString(),
                        examples: [n]
                    });
                } else {
                    const c = cycles.get(cycleKey);
                    if (c.examples.length < 5) {
                        c.examples.push(n);
                    }
                }
                break;
            }

            seen.set(currentStr, path.length);
            path.push(currentStr);
            current = digitPowerSum(current, power);
        }

        if (n % 100 === 0) {
            self.postMessage({
                type: 'progress',
                current: n,
                total: maxSearch,
                percentage: Math.floor((n / maxSearch) * 100)
            });
        }
    }

    return {
        power,
        searchRange: maxSearch,
        cycleCount: cycles.size,
        cycles: Array.from(cycles.values()).sort((a, b) => a.length - b.length)
    };
}

/**
 * Check if number is happy in different bases
 */
function checkHappyBases(numStr, maxBase) {
    const n = parseInt(numStr);
    const results = [];

    for (let base = 2; base <= maxBase; base++) {
        const isHappyInBase = isHappyBase(n, base);
        results.push({
            base,
            representation: n.toString(base).toUpperCase(),
            isHappy: isHappyInBase.isHappy,
            steps: isHappyInBase.iterations
        });
    }

    const happyBases = results.filter(r => r.isHappy).map(r => r.base);

    return {
        number: numStr,
        maxBase,
        results,
        happyBases,
        happyCount: happyBases.length
    };
}

/**
 * Check if number is happy in a given base
 */
function isHappyBase(n, base) {
    const seen = new Set();
    let current = n;
    let iterations = 0;

    while (current !== 1 && iterations < 1000) {
        if (seen.has(current)) {
            return { isHappy: false, iterations };
        }
        seen.add(current);

        // Sum of squared digits in given base
        let sum = 0;
        let temp = current;
        while (temp > 0) {
            const digit = temp % base;
            sum += digit * digit;
            temp = Math.floor(temp / base);
        }

        current = sum;
        iterations++;
    }

    return { isHappy: current === 1, iterations };
}
