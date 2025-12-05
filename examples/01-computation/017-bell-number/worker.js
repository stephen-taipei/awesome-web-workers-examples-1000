// Bell Number Calculator Web Worker
// Uses Bell Triangle (Aitken's Array) method with BigInt for large numbers

self.onmessage = function(e) {
    const { type, n } = e.data;

    try {
        const startTime = performance.now();

        switch (type) {
            case 'single':
                const singleResult = calculateBellNumber(n);
                self.postMessage({
                    type: 'result',
                    resultType: 'single',
                    n: n,
                    value: singleResult.toString(),
                    digits: singleResult.toString().length,
                    time: performance.now() - startTime
                });
                break;

            case 'sequence':
                const sequence = calculateBellSequence(n);
                self.postMessage({
                    type: 'result',
                    resultType: 'sequence',
                    n: n,
                    values: sequence.map(v => v.toString()),
                    time: performance.now() - startTime
                });
                break;

            case 'triangle':
                const triangle = calculateBellTriangle(n);
                self.postMessage({
                    type: 'result',
                    resultType: 'triangle',
                    n: n,
                    triangle: triangle.map(row => row.map(v => v.toString())),
                    time: performance.now() - startTime
                });
                break;

            default:
                throw new Error('Unknown calculation type');
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message
        });
    }
};

// Calculate single Bell number B(n)
function calculateBellNumber(n) {
    if (n < 0) throw new Error('n must be non-negative');
    if (n === 0) return 1n;

    // Use Bell Triangle method
    // We only need to keep track of the current row
    let row = [1n];

    for (let i = 1; i <= n; i++) {
        // Report progress for large calculations
        if (i % 50 === 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percent: Math.round((i / n) * 100)
            });
        }

        const newRow = [row[row.length - 1]]; // First element is last element of previous row

        for (let j = 1; j <= i; j++) {
            newRow.push(newRow[j - 1] + row[j - 1]);
        }

        row = newRow;
    }

    return row[0]; // B(n) is the first element of row n
}

// Calculate Bell sequence from B(0) to B(n)
function calculateBellSequence(n) {
    if (n < 0) throw new Error('n must be non-negative');

    const sequence = [1n]; // B(0) = 1
    if (n === 0) return sequence;

    let row = [1n];

    for (let i = 1; i <= n; i++) {
        // Report progress
        if (i % 20 === 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percent: Math.round((i / n) * 100)
            });
        }

        const newRow = [row[row.length - 1]];

        for (let j = 1; j <= i; j++) {
            newRow.push(newRow[j - 1] + row[j - 1]);
        }

        sequence.push(newRow[0]); // B(i) is first element of row i
        row = newRow;
    }

    return sequence;
}

// Calculate full Bell Triangle up to row n
function calculateBellTriangle(n) {
    if (n < 0) throw new Error('n must be non-negative');

    const triangle = [[1n]]; // Row 0
    if (n === 0) return triangle;

    let row = [1n];

    for (let i = 1; i <= n; i++) {
        // Report progress
        if (i % 10 === 0) {
            self.postMessage({
                type: 'progress',
                current: i,
                total: n,
                percent: Math.round((i / n) * 100)
            });
        }

        const newRow = [row[row.length - 1]];

        for (let j = 1; j <= i; j++) {
            newRow.push(newRow[j - 1] + row[j - 1]);
        }

        triangle.push([...newRow]);
        row = newRow;
    }

    return triangle;
}
