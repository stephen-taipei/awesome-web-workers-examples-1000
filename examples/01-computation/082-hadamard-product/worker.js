/**
 * Hadamard Product Worker
 * Implements element-wise matrix operations using TypedArray for performance
 */

/**
 * Hadamard (element-wise) product: C = A ∘ B
 */
function hadamardProduct(A, B, rows, cols) {
    const n = rows * cols;
    const C = new Float64Array(n);

    for (let i = 0; i < n; i++) {
        C[i] = A[i] * B[i];

        if (i % 100000 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / n) * 100) });
        }
    }

    return C;
}

/**
 * Hadamard (element-wise) division: C = A ⊘ B
 */
function hadamardDivision(A, B, rows, cols) {
    const n = rows * cols;
    const C = new Float64Array(n);

    for (let i = 0; i < n; i++) {
        if (Math.abs(B[i]) < 1e-15) {
            C[i] = A[i] >= 0 ? Infinity : -Infinity;
        } else {
            C[i] = A[i] / B[i];
        }

        if (i % 100000 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / n) * 100) });
        }
    }

    return C;
}

/**
 * Hadamard (element-wise) power: C = A.^n
 */
function hadamardPower(A, power, rows, cols) {
    const n = rows * cols;
    const C = new Float64Array(n);

    for (let i = 0; i < n; i++) {
        C[i] = Math.pow(A[i], power);

        if (i % 100000 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / n) * 100) });
        }
    }

    return C;
}

/**
 * Schur complement: S = D - C * A^(-1) * B (element-wise operations for demo)
 * This is a simplified version showing element-wise division in context
 */
function schurComplement(A, B, C, D, rows, cols) {
    const n = rows * cols;
    const result = new Float64Array(n);

    // Simplified: S = D - (C ∘ B) ⊘ A
    for (let i = 0; i < n; i++) {
        const cb = C[i] * B[i];
        if (Math.abs(A[i]) < 1e-15) {
            result[i] = D[i];
        } else {
            result[i] = D[i] - cb / A[i];
        }

        if (i % 100000 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / n) * 100) });
        }
    }

    return result;
}

/**
 * Generate random matrix as TypedArray
 */
function generateRandomMatrix(rows, cols, min = -10, max = 10) {
    const n = rows * cols;
    const matrix = new Float64Array(n);

    for (let i = 0; i < n; i++) {
        matrix[i] = Math.random() * (max - min) + min;
    }

    return matrix;
}

/**
 * Compute statistics
 */
function computeStats(data) {
    let sum = 0;
    let sumSq = 0;
    let min = Infinity;
    let max = -Infinity;
    let nonZero = 0;

    for (let i = 0; i < data.length; i++) {
        const val = data[i];
        if (isFinite(val)) {
            sum += val;
            sumSq += val * val;
            if (val < min) min = val;
            if (val > max) max = val;
            if (Math.abs(val) > 1e-10) nonZero++;
        }
    }

    const mean = sum / data.length;
    const variance = sumSq / data.length - mean * mean;

    return {
        min,
        max,
        mean,
        std: Math.sqrt(Math.max(0, variance)),
        nonZeroCount: nonZero,
        frobeniusNorm: Math.sqrt(sumSq)
    };
}

/**
 * Extract submatrix for display
 */
function extractSubmatrix(data, rows, cols, maxSize = 5) {
    const displayRows = Math.min(rows, maxSize);
    const displayCols = Math.min(cols, maxSize);
    const sub = [];

    for (let i = 0; i < displayRows; i++) {
        sub[i] = [];
        for (let j = 0; j < displayCols; j++) {
            sub[i][j] = data[i * cols + j];
        }
    }

    return sub;
}

// Operation handlers
function handleHadamard(data) {
    const { A, B, rows, cols } = data;
    const startTime = performance.now();

    const C = hadamardProduct(A, B, rows, cols);

    const executionTime = performance.now() - startTime;
    const stats = computeStats(C);

    return {
        operation: 'Hadamard Product',
        description: 'C[i,j] = A[i,j] × B[i,j]',
        rows,
        cols,
        totalElements: rows * cols,
        stats,
        submatrix: extractSubmatrix(C, rows, cols),
        executionTime,
        throughput: ((rows * cols) / (executionTime / 1000) / 1e6).toFixed(2)
    };
}

function handleHadamardDiv(data) {
    const { A, B, rows, cols } = data;
    const startTime = performance.now();

    const C = hadamardDivision(A, B, rows, cols);

    const executionTime = performance.now() - startTime;
    const stats = computeStats(C);

    return {
        operation: 'Hadamard Division',
        description: 'C[i,j] = A[i,j] / B[i,j]',
        rows,
        cols,
        totalElements: rows * cols,
        stats,
        submatrix: extractSubmatrix(C, rows, cols),
        executionTime,
        throughput: ((rows * cols) / (executionTime / 1000) / 1e6).toFixed(2)
    };
}

function handleHadamardPower(data) {
    const { A, rows, cols, power } = data;
    const startTime = performance.now();

    const C = hadamardPower(A, power, rows, cols);

    const executionTime = performance.now() - startTime;
    const stats = computeStats(C);

    return {
        operation: 'Hadamard Power',
        description: `C[i,j] = A[i,j]^${power}`,
        rows,
        cols,
        power,
        totalElements: rows * cols,
        stats,
        submatrix: extractSubmatrix(C, rows, cols),
        executionTime,
        throughput: ((rows * cols) / (executionTime / 1000) / 1e6).toFixed(2)
    };
}

function handleSchurComplement(data) {
    const { rows, cols } = data;

    // Generate 4 matrices for the block structure
    const A = generateRandomMatrix(rows, cols, 1, 10);  // Avoid zeros
    const B = generateRandomMatrix(rows, cols);
    const C = generateRandomMatrix(rows, cols);
    const D = generateRandomMatrix(rows, cols);

    const startTime = performance.now();

    const S = schurComplement(A, B, C, D, rows, cols);

    const executionTime = performance.now() - startTime;
    const stats = computeStats(S);

    return {
        operation: 'Schur Complement',
        description: 'S = D - (C ∘ B) ⊘ A',
        rows,
        cols,
        totalElements: rows * cols,
        stats,
        submatrix: extractSubmatrix(S, rows, cols),
        executionTime
    };
}

function handleBenchmark(data) {
    const { A, B, rows, cols, power } = data;
    const n = rows * cols;
    const results = [];

    // Hadamard product
    postMessage({ type: 'progress', percentage: 20 });
    let start = performance.now();
    const iterations = Math.min(100, Math.max(1, Math.floor(10000000 / n)));
    for (let iter = 0; iter < iterations; iter++) {
        hadamardProduct(A, B, rows, cols);
    }
    const prodTime = (performance.now() - start) / iterations;
    results.push({
        name: `Product (×${iterations})`,
        time: prodTime.toFixed(3),
        throughput: (n / (prodTime / 1000) / 1e6).toFixed(2)
    });

    // Hadamard division
    postMessage({ type: 'progress', percentage: 40 });
    start = performance.now();
    for (let iter = 0; iter < iterations; iter++) {
        hadamardDivision(A, B, rows, cols);
    }
    const divTime = (performance.now() - start) / iterations;
    results.push({
        name: `Division (×${iterations})`,
        time: divTime.toFixed(3),
        throughput: (n / (divTime / 1000) / 1e6).toFixed(2)
    });

    // Hadamard power
    postMessage({ type: 'progress', percentage: 60 });
    start = performance.now();
    for (let iter = 0; iter < iterations; iter++) {
        hadamardPower(A, power, rows, cols);
    }
    const powTime = (performance.now() - start) / iterations;
    results.push({
        name: `Power (×${iterations})`,
        time: powTime.toFixed(3),
        throughput: (n / (powTime / 1000) / 1e6).toFixed(2)
    });

    // Native TypedArray comparison
    postMessage({ type: 'progress', percentage: 80 });
    start = performance.now();
    for (let iter = 0; iter < iterations; iter++) {
        const C = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            C[i] = A[i] * B[i];
        }
    }
    const nativeTime = (performance.now() - start) / iterations;
    results.push({
        name: `Native Loop (×${iterations})`,
        time: nativeTime.toFixed(3),
        throughput: (n / (nativeTime / 1000) / 1e6).toFixed(2)
    });

    postMessage({ type: 'progress', percentage: 100 });

    return {
        operation: 'Benchmark',
        description: 'Performance comparison of element-wise operations',
        rows,
        cols,
        totalElements: n,
        benchmarks: results
    };
}

// Message handler
self.onmessage = function(e) {
    const { type, data } = e.data;

    try {
        let result;
        const startTime = performance.now();

        // Generate data if needed
        if (data.generate) {
            data.A = generateRandomMatrix(data.rows, data.cols);
            data.B = generateRandomMatrix(data.rows, data.cols);
            // Avoid zeros in B for division
            for (let i = 0; i < data.B.length; i++) {
                if (Math.abs(data.B[i]) < 0.1) {
                    data.B[i] = data.B[i] >= 0 ? 0.1 : -0.1;
                }
            }
        }

        switch (type) {
            case 'hadamard':
                result = handleHadamard(data);
                break;
            case 'hadamardDiv':
                result = handleHadamardDiv(data);
                break;
            case 'hadamardPower':
                result = handleHadamardPower(data);
                break;
            case 'schurComplement':
                result = handleSchurComplement(data);
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
