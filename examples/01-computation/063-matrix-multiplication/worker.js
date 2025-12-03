/**
 * Web Worker: Matrix Multiplication
 * Standard, Strassen, and Block algorithms
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'standard':
                result = standardMultiply(data.matrixA, data.matrixB);
                break;
            case 'strassen':
                result = strassenMultiply(data.matrixA, data.matrixB);
                break;
            case 'block':
                result = blockMultiply(data.matrixA, data.matrixB, data.blockSize || 32);
                break;
            case 'compare':
                result = compareAlgorithms(data.matrixA, data.matrixB);
                break;
            default:
                throw new Error('Unknown algorithm type');
        }

        const executionTime = (performance.now() - startTime).toFixed(2);
        self.postMessage({ type: 'result', algorithm: type, result, executionTime });
    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};

/**
 * Standard Matrix Multiplication - O(n³)
 */
function standardMultiply(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const rowsB = B.length;
    const colsB = B[0].length;

    if (colsA !== rowsB) {
        throw new Error(`Dimension mismatch: A(${rowsA}×${colsA}) cannot multiply B(${rowsB}×${colsB})`);
    }

    const C = [];
    const totalOps = rowsA * colsB;
    let opsCompleted = 0;

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let i = 0; i < rowsA; i++) {
        C[i] = new Array(colsB).fill(0);
        for (let j = 0; j < colsB; j++) {
            let sum = 0;
            for (let k = 0; k < colsA; k++) {
                sum += A[i][k] * B[k][j];
            }
            C[i][j] = sum;
            opsCompleted++;

            if (opsCompleted % Math.floor(totalOps / 10) === 0) {
                self.postMessage({
                    type: 'progress',
                    percentage: 10 + Math.round((opsCompleted / totalOps) * 80)
                });
            }
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        algorithm: 'Standard Multiplication',
        complexity: 'O(n³)',
        result: C,
        dimensions: { rows: rowsA, cols: colsB },
        operations: rowsA * colsA * colsB,
        description: 'Direct implementation using three nested loops'
    };
}

/**
 * Strassen Algorithm - O(n^2.807)
 * Works best for large square matrices with power-of-2 dimensions
 */
function strassenMultiply(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const rowsB = B.length;
    const colsB = B[0].length;

    if (colsA !== rowsB) {
        throw new Error(`Dimension mismatch: A(${rowsA}×${colsA}) cannot multiply B(${rowsB}×${colsB})`);
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // Pad matrices to power of 2
    const maxDim = Math.max(rowsA, colsA, colsB);
    const n = nextPowerOf2(maxDim);

    const paddedA = padMatrix(A, n, n);
    const paddedB = padMatrix(B, n, n);

    self.postMessage({ type: 'progress', percentage: 20 });

    // Strassen recursion with threshold
    const threshold = 64; // Use standard multiplication for small matrices
    const paddedC = strassenRecursive(paddedA, paddedB, threshold);

    self.postMessage({ type: 'progress', percentage: 90 });

    // Extract result
    const C = [];
    for (let i = 0; i < rowsA; i++) {
        C[i] = paddedC[i].slice(0, colsB);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        algorithm: 'Strassen Algorithm',
        complexity: 'O(n^2.807)',
        result: C,
        dimensions: { rows: rowsA, cols: colsB },
        paddedSize: n,
        description: 'Divide-and-conquer with 7 multiplications instead of 8'
    };
}

function strassenRecursive(A, B, threshold) {
    const n = A.length;

    // Base case: use standard multiplication for small matrices
    if (n <= threshold) {
        return standardMultiplySimple(A, B);
    }

    const half = n / 2;

    // Partition matrices
    const [A11, A12, A21, A22] = partitionMatrix(A);
    const [B11, B12, B21, B22] = partitionMatrix(B);

    // Strassen's 7 products
    const M1 = strassenRecursive(addMatrices(A11, A22), addMatrices(B11, B22), threshold);
    const M2 = strassenRecursive(addMatrices(A21, A22), B11, threshold);
    const M3 = strassenRecursive(A11, subtractMatrices(B12, B22), threshold);
    const M4 = strassenRecursive(A22, subtractMatrices(B21, B11), threshold);
    const M5 = strassenRecursive(addMatrices(A11, A12), B22, threshold);
    const M6 = strassenRecursive(subtractMatrices(A21, A11), addMatrices(B11, B12), threshold);
    const M7 = strassenRecursive(subtractMatrices(A12, A22), addMatrices(B21, B22), threshold);

    // Compute result quadrants
    const C11 = addMatrices(subtractMatrices(addMatrices(M1, M4), M5), M7);
    const C12 = addMatrices(M3, M5);
    const C21 = addMatrices(M2, M4);
    const C22 = addMatrices(subtractMatrices(addMatrices(M1, M3), M2), M6);

    // Combine quadrants
    return combineMatrices(C11, C12, C21, C22);
}

/**
 * Block (Tiled) Matrix Multiplication - Cache Optimized
 */
function blockMultiply(A, B, blockSize = 32) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const rowsB = B.length;
    const colsB = B[0].length;

    if (colsA !== rowsB) {
        throw new Error(`Dimension mismatch: A(${rowsA}×${colsA}) cannot multiply B(${rowsB}×${colsB})`);
    }

    const C = [];
    for (let i = 0; i < rowsA; i++) {
        C[i] = new Array(colsB).fill(0);
    }

    const totalBlocks = Math.ceil(rowsA / blockSize) * Math.ceil(colsB / blockSize) * Math.ceil(colsA / blockSize);
    let blocksCompleted = 0;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Block multiplication
    for (let ii = 0; ii < rowsA; ii += blockSize) {
        for (let jj = 0; jj < colsB; jj += blockSize) {
            for (let kk = 0; kk < colsA; kk += blockSize) {
                // Multiply blocks
                const iMax = Math.min(ii + blockSize, rowsA);
                const jMax = Math.min(jj + blockSize, colsB);
                const kMax = Math.min(kk + blockSize, colsA);

                for (let i = ii; i < iMax; i++) {
                    for (let j = jj; j < jMax; j++) {
                        let sum = C[i][j];
                        for (let k = kk; k < kMax; k++) {
                            sum += A[i][k] * B[k][j];
                        }
                        C[i][j] = sum;
                    }
                }

                blocksCompleted++;
                if (blocksCompleted % Math.max(1, Math.floor(totalBlocks / 10)) === 0) {
                    self.postMessage({
                        type: 'progress',
                        percentage: 10 + Math.round((blocksCompleted / totalBlocks) * 80)
                    });
                }
            }
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        algorithm: 'Block Multiplication',
        complexity: 'O(n³) cache-optimized',
        result: C,
        dimensions: { rows: rowsA, cols: colsB },
        blockSize: blockSize,
        description: 'Tiled algorithm for better cache utilization'
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A, B) {
    const results = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    // Standard
    const standardStart = performance.now();
    const standardResult = standardMultiply(A, B);
    const standardTime = performance.now() - standardStart;
    results.push({
        algorithm: 'Standard',
        time: standardTime.toFixed(2),
        complexity: 'O(n³)'
    });

    self.postMessage({ type: 'progress', percentage: 40 });

    // Block
    const blockStart = performance.now();
    const blockResult = blockMultiply(A, B, 32);
    const blockTime = performance.now() - blockStart;
    results.push({
        algorithm: 'Block (32)',
        time: blockTime.toFixed(2),
        complexity: 'O(n³) cache-opt'
    });

    self.postMessage({ type: 'progress', percentage: 70 });

    // Strassen (only for larger matrices)
    const maxDim = Math.max(A.length, A[0].length, B[0].length);
    if (maxDim >= 32) {
        const strassenStart = performance.now();
        const strassenResult = strassenMultiply(A, B);
        const strassenTime = performance.now() - strassenStart;
        results.push({
            algorithm: 'Strassen',
            time: strassenTime.toFixed(2),
            complexity: 'O(n^2.807)'
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Verify results match
    const verified = verifyResults(standardResult.result, blockResult.result);

    return {
        algorithm: 'Algorithm Comparison',
        result: standardResult.result,
        dimensions: standardResult.dimensions,
        comparison: results,
        verified: verified,
        description: 'Performance comparison of different multiplication algorithms'
    };
}

// ========== Helper Functions ==========

function standardMultiplySimple(A, B) {
    const n = A.length;
    const C = [];
    for (let i = 0; i < n; i++) {
        C[i] = new Array(n).fill(0);
        for (let j = 0; j < n; j++) {
            for (let k = 0; k < n; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return C;
}

function nextPowerOf2(n) {
    let power = 1;
    while (power < n) power *= 2;
    return power;
}

function padMatrix(M, rows, cols) {
    const padded = [];
    for (let i = 0; i < rows; i++) {
        padded[i] = new Array(cols).fill(0);
        if (i < M.length) {
            for (let j = 0; j < M[i].length; j++) {
                padded[i][j] = M[i][j];
            }
        }
    }
    return padded;
}

function partitionMatrix(M) {
    const n = M.length;
    const half = n / 2;
    const A11 = [], A12 = [], A21 = [], A22 = [];

    for (let i = 0; i < half; i++) {
        A11[i] = M[i].slice(0, half);
        A12[i] = M[i].slice(half);
        A21[i] = M[i + half].slice(0, half);
        A22[i] = M[i + half].slice(half);
    }

    return [A11, A12, A21, A22];
}

function combineMatrices(C11, C12, C21, C22) {
    const half = C11.length;
    const n = half * 2;
    const C = [];

    for (let i = 0; i < n; i++) {
        C[i] = new Array(n);
        if (i < half) {
            for (let j = 0; j < half; j++) C[i][j] = C11[i][j];
            for (let j = half; j < n; j++) C[i][j] = C12[i][j - half];
        } else {
            for (let j = 0; j < half; j++) C[i][j] = C21[i - half][j];
            for (let j = half; j < n; j++) C[i][j] = C22[i - half][j - half];
        }
    }

    return C;
}

function addMatrices(A, B) {
    const n = A.length;
    const C = [];
    for (let i = 0; i < n; i++) {
        C[i] = new Array(n);
        for (let j = 0; j < n; j++) {
            C[i][j] = A[i][j] + B[i][j];
        }
    }
    return C;
}

function subtractMatrices(A, B) {
    const n = A.length;
    const C = [];
    for (let i = 0; i < n; i++) {
        C[i] = new Array(n);
        for (let j = 0; j < n; j++) {
            C[i][j] = A[i][j] - B[i][j];
        }
    }
    return C;
}

function verifyResults(A, B) {
    if (A.length !== B.length || A[0].length !== B[0].length) return false;
    const epsilon = 1e-10;
    for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < A[0].length; j++) {
            if (Math.abs(A[i][j] - B[i][j]) > epsilon) return false;
        }
    }
    return true;
}
