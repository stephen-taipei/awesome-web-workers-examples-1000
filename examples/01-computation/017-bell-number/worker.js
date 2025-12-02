/**
 * Web Worker: Bell Number Calculator
 *
 * Computes Bell numbers using Bell Triangle method.
 * Bell numbers count the number of ways to partition a set.
 *
 * B(0) = 1
 * B(1) = 1
 * B(2) = 2
 * B(3) = 5
 * B(4) = 15
 * B(5) = 52
 * ...
 */

/**
 * Calculate Bell numbers using Bell Triangle (also known as Aitken's array)
 *
 * Bell Triangle construction:
 * Row 0: 1
 * Row 1: 1, 2
 * Row 2: 2, 3, 5
 * Row 3: 5, 7, 10, 15
 * Row 4: 15, 20, 27, 37, 52
 *
 * - First element of each row = last element of previous row
 * - Each subsequent element = sum of element to its left + element above left element
 * - B(n) = first element of row n
 *
 * @param {number} n - Calculate Bell numbers from B(0) to B(n)
 * @returns {Array<{index: number, value: string}>} Array of Bell numbers
 */
function calculateBellNumbers(n) {
    if (n < 0) {
        throw new Error('n must be a non-negative integer');
    }

    const results = [];

    // B(0) = 1
    results.push({ index: 0, value: '1' });

    if (n === 0) {
        return results;
    }

    // Use BigInt for large number support
    // Bell Triangle: we only need to keep the current and previous row
    let prevRow = [1n];

    for (let i = 1; i <= n; i++) {
        const currentRow = new Array(i + 1);

        // First element = last element of previous row
        currentRow[0] = prevRow[prevRow.length - 1];

        // Build the rest of the row
        for (let j = 1; j <= i; j++) {
            currentRow[j] = currentRow[j - 1] + prevRow[j - 1];
        }

        // B(i) = first element of row i = last element of row i-1
        results.push({
            index: i,
            value: currentRow[0].toString()
        });

        // Report progress every 10 iterations or at the end
        if (i % 10 === 0 || i === n) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.round((i / n) * 100)
            });
        }

        prevRow = currentRow;
    }

    return results;
}

/**
 * Calculate a single Bell number B(n)
 * More memory efficient for calculating just one value
 *
 * @param {number} n - The index of Bell number to calculate
 * @returns {string} The Bell number as string
 */
function calculateSingleBellNumber(n) {
    if (n < 0) {
        throw new Error('n must be a non-negative integer');
    }

    if (n === 0) {
        return '1';
    }

    let prevRow = [1n];

    for (let i = 1; i <= n; i++) {
        const currentRow = new Array(i + 1);
        currentRow[0] = prevRow[prevRow.length - 1];

        for (let j = 1; j <= i; j++) {
            currentRow[j] = currentRow[j - 1] + prevRow[j - 1];
        }

        if (i % 10 === 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.round((i / n) * 100)
            });
        }

        prevRow = currentRow;
    }

    return prevRow[0].toString();
}

/**
 * Generate the Bell Triangle up to row n
 *
 * @param {number} n - Number of rows to generate
 * @returns {Array<Array<string>>} The Bell Triangle
 */
function generateBellTriangle(n) {
    if (n < 0) {
        throw new Error('n must be a non-negative integer');
    }

    const triangle = [];

    // Row 0
    triangle.push(['1']);

    if (n === 0) {
        return triangle;
    }

    let prevRow = [1n];

    for (let i = 1; i <= n; i++) {
        const currentRow = new Array(i + 1);
        currentRow[0] = prevRow[prevRow.length - 1];

        for (let j = 1; j <= i; j++) {
            currentRow[j] = currentRow[j - 1] + prevRow[j - 1];
        }

        triangle.push(currentRow.map(v => v.toString()));

        if (i % 5 === 0 || i === n) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percentage: Math.round((i / n) * 100)
            });
        }

        prevRow = currentRow;
    }

    return triangle;
}

// Handle messages from main thread
self.onmessage = function(e) {
    const { type, n } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'sequence':
                // Calculate Bell numbers from B(0) to B(n)
                result = calculateBellNumbers(n);
                break;

            case 'single':
                // Calculate single Bell number B(n)
                result = calculateSingleBellNumber(n);
                break;

            case 'triangle':
                // Generate Bell Triangle
                result = generateBellTriangle(n);
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
