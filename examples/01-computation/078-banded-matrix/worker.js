/**
 * Banded Matrix Operations Worker
 * Implements compressed storage and efficient algorithms for banded matrices
 */

/**
 * Banded matrix stored in compressed form
 * bands[i] contains the i-th diagonal, where:
 *   i = 0 is the lowest diagonal (offset -lowerBand)
 *   i = lowerBand is the main diagonal
 *   i = lowerBand + upperBand is the uppermost diagonal
 */

/**
 * Create banded matrix storage
 * @param {number} n - Matrix size
 * @param {number} lowerBand - Number of lower diagonals
 * @param {number} upperBand - Number of upper diagonals
 */
function createBandedMatrix(n, lowerBand, upperBand) {
    const numBands = lowerBand + upperBand + 1;
    const bands = [];
    for (let d = 0; d < numBands; d++) {
        const offset = d - lowerBand;
        const len = n - Math.abs(offset);
        bands.push(new Float64Array(len));
    }
    return { bands, n, lowerBand, upperBand };
}

/**
 * Get element at (i, j) from banded matrix
 */
function getBandedElement(banded, i, j) {
    const { bands, n, lowerBand, upperBand } = banded;
    const offset = j - i;

    if (offset < -lowerBand || offset > upperBand) {
        return 0;
    }

    const bandIdx = offset + lowerBand;
    const elemIdx = offset >= 0 ? i : j;

    return bands[bandIdx][elemIdx];
}

/**
 * Set element at (i, j) in banded matrix
 */
function setBandedElement(banded, i, j, value) {
    const { bands, lowerBand, upperBand } = banded;
    const offset = j - i;

    if (offset < -lowerBand || offset > upperBand) {
        if (Math.abs(value) > 1e-15) {
            throw new Error(`Element (${i},${j}) outside band structure`);
        }
        return;
    }

    const bandIdx = offset + lowerBand;
    const elemIdx = offset >= 0 ? i : j;

    bands[bandIdx][elemIdx] = value;
}

/**
 * Banded matrix-vector multiplication: y = A * x
 */
function bandedMatVec(banded, x) {
    const { bands, n, lowerBand, upperBand } = banded;
    const y = new Float64Array(n);

    for (let i = 0; i < n; i++) {
        let sum = 0;
        const jMin = Math.max(0, i - lowerBand);
        const jMax = Math.min(n - 1, i + upperBand);

        for (let j = jMin; j <= jMax; j++) {
            const offset = j - i;
            const bandIdx = offset + lowerBand;
            const elemIdx = offset >= 0 ? i : j;
            sum += bands[bandIdx][elemIdx] * x[j];
        }
        y[i] = sum;

        if (i % 10000 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / n) * 100) });
        }
    }

    return y;
}

/**
 * LU decomposition for banded matrix (in-place style, returns L and U bands)
 */
function bandedLU(banded) {
    const { bands, n, lowerBand, upperBand } = banded;

    // Create copies for L and U
    const L = createBandedMatrix(n, lowerBand, 0);
    const U = createBandedMatrix(n, 0, upperBand);

    // Copy diagonal and upper to U
    for (let d = 0; d <= upperBand; d++) {
        const bandIdx = lowerBand + d;
        for (let i = 0; i < bands[bandIdx].length; i++) {
            U.bands[d][i] = bands[bandIdx][i];
        }
    }

    // Initialize L diagonal to 1
    for (let i = 0; i < n; i++) {
        L.bands[lowerBand][i] = 1;
    }

    // Gaussian elimination
    for (let k = 0; k < n - 1; k++) {
        const pivot = getBandedElement(U, k, k);
        if (Math.abs(pivot) < 1e-15) {
            throw new Error('Zero pivot encountered - matrix may be singular');
        }

        const iMax = Math.min(k + lowerBand, n - 1);
        for (let i = k + 1; i <= iMax; i++) {
            const factor = getBandedElement(U, i, k) / pivot;
            setBandedElement(L, i, k, factor);

            const jMax = Math.min(k + upperBand, n - 1);
            for (let j = k; j <= jMax; j++) {
                const val = getBandedElement(U, i, j) - factor * getBandedElement(U, k, j);
                setBandedElement(U, i, j, val);
            }
        }

        if (k % 10000 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((k / n) * 50) });
        }
    }

    return { L, U };
}

/**
 * Solve banded system Ax = b using LU decomposition
 */
function solveBanded(banded, b) {
    const { n, lowerBand, upperBand } = banded;

    // LU decomposition
    const { L, U } = bandedLU(banded);

    // Forward substitution: Ly = b
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        let sum = b[i];
        const jMin = Math.max(0, i - lowerBand);
        for (let j = jMin; j < i; j++) {
            sum -= getBandedElement(L, i, j) * y[j];
        }
        y[i] = sum;

        if (i % 10000 === 0) {
            postMessage({ type: 'progress', percentage: 50 + Math.floor((i / n) * 25) });
        }
    }

    // Back substitution: Ux = y
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
        let sum = y[i];
        const jMax = Math.min(n - 1, i + upperBand);
        for (let j = i + 1; j <= jMax; j++) {
            sum -= getBandedElement(U, i, j) * x[j];
        }
        x[i] = sum / getBandedElement(U, i, i);

        if ((n - 1 - i) % 10000 === 0) {
            postMessage({ type: 'progress', percentage: 75 + Math.floor(((n - 1 - i) / n) * 25) });
        }
    }

    return x;
}

/**
 * Add two banded matrices with same structure
 */
function addBanded(A, B) {
    const { bands: bandsA, n, lowerBand, upperBand } = A;
    const { bands: bandsB } = B;

    const C = createBandedMatrix(n, lowerBand, upperBand);

    for (let d = 0; d < bandsA.length; d++) {
        for (let i = 0; i < bandsA[d].length; i++) {
            C.bands[d][i] = bandsA[d][i] + bandsB[d][i];
        }
    }

    return C;
}

/**
 * Generate random diagonally dominant banded matrix
 */
function generateRandomBanded(n, lowerBand, upperBand) {
    const banded = createBandedMatrix(n, lowerBand, upperBand);

    for (let i = 0; i < n; i++) {
        let rowSum = 0;

        // Fill off-diagonal elements
        for (let d = 0; d < lowerBand + upperBand + 1; d++) {
            const offset = d - lowerBand;
            if (offset === 0) continue;

            const j = i + offset;
            if (j >= 0 && j < n) {
                const val = Math.random() * 2 - 1;
                setBandedElement(banded, i, j, val);
                rowSum += Math.abs(val);
            }
        }

        // Make diagonally dominant
        setBandedElement(banded, i, i, rowSum + 1 + Math.random());

        if (i % 10000 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / n) * 30) });
        }
    }

    return banded;
}

/**
 * Compute residual ||Ax - b||
 */
function computeResidual(banded, x, b) {
    const Ax = bandedMatVec(banded, x);
    let norm = 0;
    for (let i = 0; i < b.length; i++) {
        const diff = Ax[i] - b[i];
        norm += diff * diff;
    }
    return Math.sqrt(norm);
}

/**
 * Count non-zero elements
 */
function countNonZeros(banded) {
    let count = 0;
    for (const band of banded.bands) {
        count += band.length;
    }
    return count;
}

// Message handlers
function handleSolve(data) {
    const { banded, b } = data;
    const startTime = performance.now();

    const x = solveBanded(banded, b);
    const residual = computeResidual(banded, x, b);

    const executionTime = performance.now() - startTime;

    return {
        operation: 'Solve Banded System',
        description: 'Ax = b using banded LU decomposition',
        matrixSize: banded.n,
        bandwidth: `p=${banded.lowerBand}, q=${banded.upperBand}`,
        totalBandwidth: banded.lowerBand + banded.upperBand + 1,
        nonZeros: countNonZeros(banded),
        residualNorm: residual,
        solutionSample: Array.from(x.slice(0, Math.min(10, x.length))),
        memoryDense: banded.n * banded.n * 8,
        memoryBanded: countNonZeros(banded) * 8,
        executionTime
    };
}

function handleMultiply(data) {
    const { banded } = data;
    const n = banded.n;
    const startTime = performance.now();

    // Generate random vector
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        x[i] = Math.random();
    }

    const y = bandedMatVec(banded, x);

    const executionTime = performance.now() - startTime;

    let yNorm = 0;
    for (let i = 0; i < n; i++) {
        yNorm += y[i] * y[i];
    }
    yNorm = Math.sqrt(yNorm);

    return {
        operation: 'Banded × Vector',
        description: 'y = Ax using band storage',
        matrixSize: n,
        bandwidth: `p=${banded.lowerBand}, q=${banded.upperBand}`,
        nonZeros: countNonZeros(banded),
        resultNorm: yNorm,
        resultSample: Array.from(y.slice(0, Math.min(10, y.length))),
        flops: 2 * countNonZeros(banded),
        executionTime
    };
}

function handleLU(data) {
    const { banded } = data;
    const startTime = performance.now();

    const { L, U } = bandedLU(banded);

    const executionTime = performance.now() - startTime;

    return {
        operation: 'Banded LU Decomposition',
        description: 'A = LU with band structure preservation',
        matrixSize: banded.n,
        bandwidth: `p=${banded.lowerBand}, q=${banded.upperBand}`,
        lBandwidth: `p=${L.lowerBand}, q=${L.upperBand}`,
        uBandwidth: `p=${U.lowerBand}, q=${U.upperBand}`,
        nonZerosL: countNonZeros(L),
        nonZerosU: countNonZeros(U),
        executionTime
    };
}

function handleAdd(data) {
    const { bandedA, bandedB } = data;
    const startTime = performance.now();

    const C = addBanded(bandedA, bandedB);

    const executionTime = performance.now() - startTime;

    return {
        operation: 'Add Banded Matrices',
        description: 'C = A + B',
        matrixSize: C.n,
        bandwidth: `p=${C.lowerBand}, q=${C.upperBand}`,
        nonZeros: countNonZeros(C),
        executionTime
    };
}

function handleBenchmark(data) {
    const { banded, b } = data;
    const n = banded.n;
    const results = [];

    // Benchmark mat-vec
    postMessage({ type: 'progress', percentage: 10 });
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = Math.random();

    let start = performance.now();
    const iterations = Math.min(100, Math.max(1, Math.floor(100000 / n)));
    for (let iter = 0; iter < iterations; iter++) {
        bandedMatVec(banded, x);
    }
    const matVecTime = (performance.now() - start) / iterations;
    results.push({
        name: `Mat-Vec (×${iterations})`,
        time: matVecTime.toFixed(3),
        flops: formatFlops(2 * countNonZeros(banded), matVecTime)
    });

    // Benchmark solve (only for smaller matrices)
    postMessage({ type: 'progress', percentage: 50 });
    if (n <= 50000) {
        start = performance.now();
        solveBanded(banded, b);
        results.push({
            name: 'Solve (LU)',
            time: (performance.now() - start).toFixed(3),
            flops: '-'
        });
    }

    // Benchmark LU
    postMessage({ type: 'progress', percentage: 80 });
    if (n <= 50000) {
        start = performance.now();
        bandedLU(banded);
        results.push({
            name: 'LU Decomposition',
            time: (performance.now() - start).toFixed(3),
            flops: '-'
        });
    }

    postMessage({ type: 'progress', percentage: 100 });

    return {
        operation: 'Benchmark',
        description: 'Performance comparison of banded operations',
        matrixSize: n,
        bandwidth: `p=${banded.lowerBand}, q=${banded.upperBand}`,
        nonZeros: countNonZeros(banded),
        benchmarks: results,
        memoryDense: formatBytes(n * n * 8),
        memoryBanded: formatBytes(countNonZeros(banded) * 8),
        memorySavings: ((1 - countNonZeros(banded) / (n * n)) * 100).toFixed(2)
    };
}

function formatFlops(ops, timeMs) {
    const flops = ops / (timeMs / 1000);
    if (flops >= 1e9) return (flops / 1e9).toFixed(2) + ' GFLOP/s';
    if (flops >= 1e6) return (flops / 1e6).toFixed(2) + ' MFLOP/s';
    return (flops / 1e3).toFixed(2) + ' KFLOP/s';
}

function formatBytes(bytes) {
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + ' MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + ' KB';
    return bytes + ' B';
}

// Message handler
self.onmessage = function(e) {
    const { type, data } = e.data;

    try {
        let result;
        const startTime = performance.now();

        // Generate banded matrix if needed
        if (data.generate) {
            data.banded = generateRandomBanded(data.n, data.lowerBand, data.upperBand);
            // Generate random b
            data.b = new Float64Array(data.n);
            for (let i = 0; i < data.n; i++) {
                data.b[i] = Math.random() * 10;
            }
            if (type === 'add') {
                data.bandedB = generateRandomBanded(data.n, data.lowerBand, data.upperBand);
            }
        }

        switch (type) {
            case 'solve':
                result = handleSolve(data);
                break;
            case 'multiply':
                result = handleMultiply(data);
                break;
            case 'luBanded':
                result = handleLU(data);
                break;
            case 'add':
                result = handleAdd({ bandedA: data.banded, bandedB: data.bandedB || data.banded });
                break;
            case 'benchmark':
                result = handleBenchmark(data);
                break;
            default:
                throw new Error('Unknown operation: ' + type);
        }

        const executionTime = performance.now() - startTime;

        postMessage({
            type: 'result',
            operation: type,
            result,
            executionTime: executionTime.toFixed(2)
        });
    } catch (error) {
        postMessage({
            type: 'error',
            message: error.message
        });
    }
};
