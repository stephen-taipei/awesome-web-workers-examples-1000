/**
 * Web Worker: Palindrome Number Detection
 *
 * Detects palindrome numbers in various bases and formats.
 * A palindrome reads the same forwards and backwards.
 */

self.onmessage = function(e) {
    const { type } = e.data;
    const startTime = performance.now();

    try {
        let result;
        switch (type) {
            case 'single':
                result = checkSingle(e.data.number, e.data.base || 10);
                break;
            case 'range':
                result = findInRange(e.data.start, e.data.end, e.data.base || 10);
                break;
            case 'multiBase':
                result = checkMultiBase(e.data.number, e.data.bases || [2, 8, 10, 16]);
                break;
            case 'statistics':
                result = calculateStatistics(e.data.start, e.data.end);
                break;
            case 'special':
                result = findSpecialPalindromes(e.data.maxDigits || 6);
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
 * Check if a string is a palindrome
 */
function isPalindromeStr(str) {
    const len = str.length;
    for (let i = 0; i < len / 2; i++) {
        if (str[i] !== str[len - 1 - i]) return false;
    }
    return true;
}

/**
 * Convert number to string in given base
 */
function toBase(n, base) {
    if (base === 10) return n.toString();

    if (typeof n === 'bigint') {
        if (n === 0n) return '0';
        let result = '';
        const bigBase = BigInt(base);
        let num = n < 0n ? -n : n;
        while (num > 0n) {
            const digit = Number(num % bigBase);
            result = (digit < 10 ? digit : String.fromCharCode(55 + digit)) + result;
            num = num / bigBase;
        }
        return (n < 0n ? '-' : '') + result;
    }

    return n.toString(base).toUpperCase();
}

/**
 * Check if number is palindrome in given base
 */
function isPalindrome(n, base = 10) {
    const str = toBase(n, base);
    return isPalindromeStr(str);
}

/**
 * Check single number with detailed analysis
 */
function checkSingle(numStr, base) {
    const n = BigInt(numStr);
    const str = toBase(n, base);
    const reversed = str.split('').reverse().join('');

    return {
        number: numStr,
        base,
        representation: str,
        reversed,
        isPalindrome: str === reversed,
        digits: str.length
    };
}

/**
 * Find all palindromes in range
 */
function findInRange(start, end, base) {
    const startN = BigInt(start);
    const endN = BigInt(end);
    const total = Number(endN - startN) + 1;
    const palindromes = [];

    let count = 0;
    let lastProgress = 0;

    for (let n = startN; n <= endN; n++) {
        if (isPalindrome(n, base)) {
            palindromes.push({
                decimal: n.toString(),
                representation: toBase(n, base)
            });
        }

        count++;
        const progress = Math.floor((count / total) * 100);
        if (progress > lastProgress && progress % 5 === 0) {
            lastProgress = progress;
            self.postMessage({
                type: 'progress',
                current: count,
                total,
                percentage: progress
            });
        }

        // Limit results
        if (palindromes.length >= 10000) {
            palindromes.push({ decimal: '...', representation: 'truncated' });
            break;
        }
    }

    return {
        base,
        range: { start, end },
        count: palindromes.length,
        total,
        palindromes: palindromes.slice(0, 200),
        density: ((palindromes.length / total) * 100).toFixed(4)
    };
}

/**
 * Check palindrome in multiple bases
 */
function checkMultiBase(numStr, bases) {
    const n = BigInt(numStr);
    const results = [];

    for (const base of bases) {
        const str = toBase(n, base);
        results.push({
            base,
            representation: str,
            isPalindrome: isPalindromeStr(str),
            digits: str.length
        });
    }

    // Check if palindrome in all bases
    const palindromeInAll = results.every(r => r.isPalindrome);
    const palindromeBases = results.filter(r => r.isPalindrome).map(r => r.base);

    return {
        number: numStr,
        results,
        palindromeInAll,
        palindromeBases
    };
}

/**
 * Calculate palindrome statistics for a range
 */
function calculateStatistics(start, end) {
    const startN = BigInt(start);
    const endN = BigInt(end);
    const total = Number(endN - startN) + 1;

    const digitCounts = {};
    let totalPalindromes = 0;
    let count = 0;
    let lastProgress = 0;

    for (let n = startN; n <= endN; n++) {
        if (isPalindrome(n, 10)) {
            totalPalindromes++;
            const digits = n.toString().length;
            digitCounts[digits] = (digitCounts[digits] || 0) + 1;
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

    // Format digit distribution
    const distribution = Object.entries(digitCounts)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .map(([digits, count]) => ({ digits: parseInt(digits), count }));

    return {
        range: { start, end },
        total,
        palindromeCount: totalPalindromes,
        density: ((totalPalindromes / total) * 100).toFixed(6),
        distribution
    };
}

/**
 * Find special palindromes (prime, square, etc.)
 */
function findSpecialPalindromes(maxDigits) {
    const results = {
        primePalindromes: [],
        squarePalindromes: [],
        cubePalindromes: [],
        multiBasePalindromes: []
    };

    const maxN = BigInt(10) ** BigInt(maxDigits);
    let n = 1n;
    let checked = 0;
    const total = Number(maxN);

    while (n < maxN) {
        checked++;

        if (isPalindrome(n, 10)) {
            // Check if prime
            if (results.primePalindromes.length < 50 && isPrimeSimple(n)) {
                results.primePalindromes.push(n.toString());
            }

            // Check if perfect square
            if (results.squarePalindromes.length < 50) {
                const sqrt = bigIntSqrt(n);
                if (sqrt * sqrt === n) {
                    results.squarePalindromes.push({
                        number: n.toString(),
                        root: sqrt.toString()
                    });
                }
            }

            // Check if perfect cube
            if (results.cubePalindromes.length < 30) {
                const cbrt = bigIntCbrt(n);
                if (cbrt * cbrt * cbrt === n) {
                    results.cubePalindromes.push({
                        number: n.toString(),
                        root: cbrt.toString()
                    });
                }
            }

            // Check multi-base palindromes (base 2 and 10)
            if (results.multiBasePalindromes.length < 30 && isPalindrome(n, 2)) {
                results.multiBasePalindromes.push({
                    decimal: n.toString(),
                    binary: toBase(n, 2)
                });
            }
        }

        // Skip even numbers after 2 for efficiency
        n += (n === 2n) ? 1n : (n % 2n === 0n ? 1n : 2n);

        if (checked % 100000 === 0) {
            self.postMessage({
                type: 'progress',
                current: checked,
                total: Math.min(total, 10000000),
                percentage: Math.min(Math.floor((checked / Math.min(total, 10000000)) * 100), 99)
            });
        }

        // Limit search time
        if (checked > 10000000) break;
    }

    return results;
}

/**
 * Simple primality test for small numbers
 */
function isPrimeSimple(n) {
    if (n < 2n) return false;
    if (n === 2n) return true;
    if (n % 2n === 0n) return false;
    if (n < 9n) return true;
    if (n % 3n === 0n) return false;

    const sqrt = bigIntSqrt(n);
    for (let i = 5n; i <= sqrt; i += 6n) {
        if (n % i === 0n || n % (i + 2n) === 0n) return false;
    }
    return true;
}

/**
 * BigInt square root (Newton's method)
 */
function bigIntSqrt(n) {
    if (n < 0n) throw new Error('Square root of negative number');
    if (n < 2n) return n;

    let x = n;
    let y = (x + 1n) / 2n;
    while (y < x) {
        x = y;
        y = (x + n / x) / 2n;
    }
    return x;
}

/**
 * BigInt cube root (Newton's method)
 */
function bigIntCbrt(n) {
    if (n === 0n) return 0n;
    if (n < 0n) return -bigIntCbrt(-n);

    let x = n;
    let y = (2n * x + n / (x * x)) / 3n;
    while (y < x) {
        x = y;
        y = (2n * x + n / (x * x)) / 3n;
    }
    return x;
}
