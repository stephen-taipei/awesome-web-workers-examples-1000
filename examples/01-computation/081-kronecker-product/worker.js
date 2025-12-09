/**
 * Kronecker Product Worker
 * Implements tensor product operations using block-wise computation
 */

/**
 * Compute Kronecker product A ⊗ B
 * Result[i*p + k][j*q + l] = A[i][j] * B[k][l]
 */
function kroneckerProduct(A, B) {
    const m = A.length;
    const n = A[0].length;
    const p = B.length;
    const q = B[0].length;

    const resultRows = m * p;
    const resultCols = n * q;

    // Use TypedArray for better performance
    const result = new Float64Array(resultRows * resultCols);

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            const aij = A[i][j];

            // Fill the block aij * B
            for (let k = 0; k < p; k++) {
                for (let l = 0; l < q; l++) {
                    const row = i * p + k;
                    const col = j * q + l;
                    result[row * resultCols + col] = aij * B[k][l];
                }
            }
        }

        if (i % 10 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / m) * 100) });
        }
    }

    return {
        data: result,
        rows: resultRows,
        cols: resultCols
    };
}

/**
 * Compute (A ⊗ B) * x without forming the full Kronecker product
 * Uses the identity: (A ⊗ B) vec(X) = vec(B X A^T)
 * where x = vec(X), X is reshaped from x
 */
function kroneckerVec(A, B, x) {
    const m = A.length;
    const n = A[0].length;
    const p = B.length;
    const q = B[0].length;

    // x should have length n * q
    if (x.length !== n * q) {
        throw new Error(`Vector length should be ${n * q}, got ${x.length}`);
    }

    // Reshape x to X (q × n matrix, column-major)
    const X = [];
    for (let i = 0; i < q; i++) {
        X[i] = [];
        for (let j = 0; j < n; j++) {
            X[i][j] = x[j * q + i];
        }
    }

    // Compute Y = B * X * A^T
    // First: temp = X * A^T (q × m)
    const temp = [];
    for (let i = 0; i < q; i++) {
        temp[i] = [];
        for (let j = 0; j < m; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += X[i][k] * A[j][k];  // A^T[k][j] = A[j][k]
            }
            temp[i][j] = sum;
        }
    }

    // Then: Y = B * temp (p × m)
    const Y = [];
    for (let i = 0; i < p; i++) {
        Y[i] = [];
        for (let j = 0; j < m; j++) {
            let sum = 0;
            for (let k = 0; k < q; k++) {
                sum += B[i][k] * temp[k][j];
            }
            Y[i][j] = sum;
        }
    }

    // Vectorize Y (column-major)
    const result = new Float64Array(m * p);
    for (let j = 0; j < m; j++) {
        for (let i = 0; i < p; i++) {
            result[j * p + i] = Y[i][j];
        }
    }

    return result;
}

/**
 * Compute Kronecker sum A ⊕ B = A ⊗ I_p + I_m ⊗ B
 * Only for square matrices
 */
function kroneckerSum(A, B) {
    const m = A.length;
    const p = B.length;

    if (A.length !== A[0].length || B.length !== B[0].length) {
        throw new Error('Kronecker sum requires square matrices');
    }

    const size = m * p;
    const result = new Float64Array(size * size);

    // A ⊗ I_p: places A[i][j] on diagonal blocks
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) {
            const aij = A[i][j];
            // This creates block at (i,j) position, with aij on diagonal
            for (let k = 0; k < p; k++) {
                const row = i * p + k;
                const col = j * p + k;
                result[row * size + col] += aij;
            }
        }
    }

    // I_m ⊗ B: places B in diagonal blocks
    for (let i = 0; i < m; i++) {
        for (let k = 0; k < p; k++) {
            for (let l = 0; l < p; l++) {
                const row = i * p + k;
                const col = i * p + l;
                result[row * size + col] += B[k][l];
            }
        }

        if (i % 10 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / m) * 100) });
        }
    }

    return {
        data: result,
        rows: size,
        cols: size
    };
}

/**
 * Generate random matrix
 */
function generateRandomMatrix(rows, cols) {
    const matrix = [];
    for (let i = 0; i < rows; i++) {
        matrix[i] = [];
        for (let j = 0; j < cols; j++) {
            matrix[i][j] = Math.random() * 2 - 1;
        }
    }
    return matrix;
}

/**
 * Compute Frobenius norm of result
 */
function frobeniusNorm(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
    }
    return Math.sqrt(sum);
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
function handleKronecker(data) {
    const { A, B } = data;
    const startTime = performance.now();

    const result = kroneckerProduct(A, B);

    const executionTime = performance.now() - startTime;

    return {
        operation: 'Kronecker Product',
        description: `(${A.length}×${A[0].length}) ⊗ (${B.length}×${B[0].length})`,
        inputA: `${A.length}×${A[0].length}`,
        inputB: `${B.length}×${B[0].length}`,
        outputSize: `${result.rows}×${result.cols}`,
        totalElements: result.rows * result.cols,
        frobeniusNorm: frobeniusNorm(result.data),
        submatrix: extractSubmatrix(result.data, result.rows, result.cols),
        executionTime
    };
}

function handleKroneckerVec(data) {
    const { A, B } = data;
    const n = A[0].length;
    const q = B[0].length;

    // Generate random vector
    const x = new Float64Array(n * q);
    for (let i = 0; i < x.length; i++) {
        x[i] = Math.random();
    }

    const startTime = performance.now();

    const y = kroneckerVec(A, B, x);

    const executionTime = performance.now() - startTime;

    let yNorm = 0;
    for (let i = 0; i < y.length; i++) {
        yNorm += y[i] * y[i];
    }
    yNorm = Math.sqrt(yNorm);

    return {
        operation: 'Kronecker × Vector',
        description: '(A ⊗ B)x without forming full product',
        inputA: `${A.length}×${A[0].length}`,
        inputB: `${B.length}×${B[0].length}`,
        vectorLength: x.length,
        resultLength: y.length,
        resultNorm: yNorm,
        resultSample: Array.from(y.slice(0, Math.min(10, y.length))),
        memorySaved: `${((1 - (A.length * A[0].length + B.length * B[0].length + x.length + y.length) / (A.length * B.length * A[0].length * B[0].length)) * 100).toFixed(1)}%`,
        executionTime
    };
}

function handleKroneckerSum(data) {
    const { A, B } = data;

    if (A.length !== A[0].length || B.length !== B[0].length) {
        throw new Error('Kronecker sum requires square matrices');
    }

    const startTime = performance.now();

    const result = kroneckerSum(A, B);

    const executionTime = performance.now() - startTime;

    return {
        operation: 'Kronecker Sum',
        description: 'A ⊕ B = A ⊗ I + I ⊗ B',
        inputA: `${A.length}×${A[0].length}`,
        inputB: `${B.length}×${B[0].length}`,
        outputSize: `${result.rows}×${result.cols}`,
        frobeniusNorm: frobeniusNorm(result.data),
        submatrix: extractSubmatrix(result.data, result.rows, result.cols),
        executionTime
    };
}

function handleBenchmark(data) {
    const { A, B } = data;
    const results = [];

    // Kronecker product
    postMessage({ type: 'progress', percentage: 20 });
    let start = performance.now();
    kroneckerProduct(A, B);
    results.push({
        name: 'Kronecker Product',
        time: (performance.now() - start).toFixed(2)
    });

    // Kronecker-vec (if applicable)
    postMessage({ type: 'progress', percentage: 50 });
    const n = A[0].length;
    const q = B[0].length;
    const x = new Float64Array(n * q);
    for (let i = 0; i < x.length; i++) x[i] = Math.random();

    start = performance.now();
    const iterations = 10;
    for (let iter = 0; iter < iterations; iter++) {
        kroneckerVec(A, B, x);
    }
    results.push({
        name: `Kronecker-Vec (×${iterations})`,
        time: ((performance.now() - start) / iterations).toFixed(2)
    });

    // Kronecker sum (if square)
    postMessage({ type: 'progress', percentage: 80 });
    if (A.length === A[0].length && B.length === B[0].length) {
        start = performance.now();
        kroneckerSum(A, B);
        results.push({
            name: 'Kronecker Sum',
            time: (performance.now() - start).toFixed(2)
        });
    }

    postMessage({ type: 'progress', percentage: 100 });

    return {
        operation: 'Benchmark',
        description: 'Performance comparison',
        inputA: `${A.length}×${A[0].length}`,
        inputB: `${B.length}×${B[0].length}`,
        outputSize: `${A.length * B.length}×${A[0].length * B[0].length}`,
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
            data.A = generateRandomMatrix(data.rowsA, data.colsA);
            data.B = generateRandomMatrix(data.rowsB, data.colsB);
        }

        switch (type) {
            case 'kronecker':
                result = handleKronecker(data);
                break;
            case 'kroneckerVec':
                result = handleKroneckerVec(data);
                break;
            case 'kroneckerSum':
                result = handleKroneckerSum(data);
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
