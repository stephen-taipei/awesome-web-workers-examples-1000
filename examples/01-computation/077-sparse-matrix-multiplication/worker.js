/**
 * Sparse Matrix Multiplication Worker
 * Implements CSR/CSC formats for efficient sparse matrix operations
 */

/**
 * Convert COO (Coordinate) format to CSR (Compressed Sparse Row)
 * COO: arrays of (row, col, value) triplets
 * CSR: values[], colIndices[], rowPointers[]
 */
function cooToCSR(coo, numRows, numCols) {
    const { rows, cols, values } = coo;
    const nnz = values.length;

    // Sort by row, then by column
    const indices = Array.from({ length: nnz }, (_, i) => i);
    indices.sort((a, b) => {
        if (rows[a] !== rows[b]) return rows[a] - rows[b];
        return cols[a] - cols[b];
    });

    const csrValues = new Float64Array(nnz);
    const colIndices = new Int32Array(nnz);
    const rowPointers = new Int32Array(numRows + 1);

    for (let i = 0; i < nnz; i++) {
        const idx = indices[i];
        csrValues[i] = values[idx];
        colIndices[i] = cols[idx];
        rowPointers[rows[idx] + 1]++;
    }

    // Cumulative sum for row pointers
    for (let i = 1; i <= numRows; i++) {
        rowPointers[i] += rowPointers[i - 1];
    }

    return {
        values: csrValues,
        colIndices,
        rowPointers,
        numRows,
        numCols,
        nnz
    };
}

/**
 * Convert COO to CSC (Compressed Sparse Column)
 */
function cooToCSC(coo, numRows, numCols) {
    const { rows, cols, values } = coo;
    const nnz = values.length;

    // Sort by column, then by row
    const indices = Array.from({ length: nnz }, (_, i) => i);
    indices.sort((a, b) => {
        if (cols[a] !== cols[b]) return cols[a] - cols[b];
        return rows[a] - rows[b];
    });

    const cscValues = new Float64Array(nnz);
    const rowIndices = new Int32Array(nnz);
    const colPointers = new Int32Array(numCols + 1);

    for (let i = 0; i < nnz; i++) {
        const idx = indices[i];
        cscValues[i] = values[idx];
        rowIndices[i] = rows[idx];
        colPointers[cols[idx] + 1]++;
    }

    // Cumulative sum for column pointers
    for (let j = 1; j <= numCols; j++) {
        colPointers[j] += colPointers[j - 1];
    }

    return {
        values: cscValues,
        rowIndices,
        colPointers,
        numRows,
        numCols,
        nnz
    };
}

/**
 * CSR matrix-vector multiplication: y = A * x
 */
function csrMatVec(csr, x) {
    const { values, colIndices, rowPointers, numRows } = csr;
    const y = new Float64Array(numRows);

    for (let i = 0; i < numRows; i++) {
        let sum = 0;
        for (let j = rowPointers[i]; j < rowPointers[i + 1]; j++) {
            sum += values[j] * x[colIndices[j]];
        }
        y[i] = sum;

        if (i % 1000 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / numRows) * 100) });
        }
    }

    return y;
}

/**
 * CSR matrix-matrix multiplication: C = A * B (both in CSR)
 * Uses row-by-row approach
 */
function csrMatMul(csrA, csrB) {
    const { values: valA, colIndices: colA, rowPointers: rowPtrA, numRows: m, numCols: k } = csrA;
    const { values: valB, colIndices: colB, rowPointers: rowPtrB, numCols: n } = csrB;

    // Result in COO format first
    const cooRows = [];
    const cooCols = [];
    const cooVals = [];

    // Temporary dense row for accumulation
    const rowAccum = new Float64Array(n);
    const colMask = new Int8Array(n);

    for (let i = 0; i < m; i++) {
        // Reset accumulator
        const usedCols = [];

        // For each non-zero in row i of A
        for (let jA = rowPtrA[i]; jA < rowPtrA[i + 1]; jA++) {
            const kA = colA[jA];
            const aVal = valA[jA];

            // Multiply with row k of B
            for (let jB = rowPtrB[kA]; jB < rowPtrB[kA + 1]; jB++) {
                const col = colB[jB];
                if (colMask[col] === 0) {
                    colMask[col] = 1;
                    usedCols.push(col);
                }
                rowAccum[col] += aVal * valB[jB];
            }
        }

        // Extract non-zeros from row i of C
        for (const col of usedCols) {
            if (Math.abs(rowAccum[col]) > 1e-15) {
                cooRows.push(i);
                cooCols.push(col);
                cooVals.push(rowAccum[col]);
            }
            rowAccum[col] = 0;
            colMask[col] = 0;
        }

        if (i % 100 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / m) * 100) });
        }
    }

    const cooCResult = {
        rows: cooRows,
        cols: cooCols,
        values: cooVals
    };

    return cooToCSR(cooCResult, m, n);
}

/**
 * Transpose CSR matrix to CSR (via CSC intermediate)
 */
function csrTranspose(csr) {
    const { values, colIndices, rowPointers, numRows, numCols, nnz } = csr;

    // CSR of A^T has the same structure as CSC of A
    const colPointers = new Int32Array(numCols + 1);
    const rowIndices = new Int32Array(nnz);
    const transValues = new Float64Array(nnz);

    // Count entries per column
    for (let i = 0; i < nnz; i++) {
        colPointers[colIndices[i] + 1]++;
    }

    // Cumulative sum
    for (let j = 1; j <= numCols; j++) {
        colPointers[j] += colPointers[j - 1];
    }

    // Fill in the transpose
    const next = new Int32Array(numCols);
    for (let i = 0; i < numRows; i++) {
        for (let j = rowPointers[i]; j < rowPointers[i + 1]; j++) {
            const col = colIndices[j];
            const dest = colPointers[col] + next[col];
            rowIndices[dest] = i;
            transValues[dest] = values[j];
            next[col]++;
        }

        if (i % 1000 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / numRows) * 100) });
        }
    }

    return {
        values: transValues,
        colIndices: rowIndices,  // In A^T, row indices become column indices
        rowPointers: colPointers,
        numRows: numCols,
        numCols: numRows,
        nnz
    };
}

/**
 * Add two CSR matrices: C = A + B
 */
function csrAdd(csrA, csrB) {
    const { values: valA, colIndices: colA, rowPointers: rowPtrA, numRows, numCols } = csrA;
    const { values: valB, colIndices: colB, rowPointers: rowPtrB } = csrB;

    const cooRows = [];
    const cooCols = [];
    const cooVals = [];

    for (let i = 0; i < numRows; i++) {
        // Merge sorted lists approach
        let ptrA = rowPtrA[i];
        let ptrB = rowPtrB[i];
        const endA = rowPtrA[i + 1];
        const endB = rowPtrB[i + 1];

        while (ptrA < endA || ptrB < endB) {
            let col, val;

            if (ptrA >= endA) {
                col = colB[ptrB];
                val = valB[ptrB];
                ptrB++;
            } else if (ptrB >= endB) {
                col = colA[ptrA];
                val = valA[ptrA];
                ptrA++;
            } else if (colA[ptrA] < colB[ptrB]) {
                col = colA[ptrA];
                val = valA[ptrA];
                ptrA++;
            } else if (colA[ptrA] > colB[ptrB]) {
                col = colB[ptrB];
                val = valB[ptrB];
                ptrB++;
            } else {
                col = colA[ptrA];
                val = valA[ptrA] + valB[ptrB];
                ptrA++;
                ptrB++;
            }

            if (Math.abs(val) > 1e-15) {
                cooRows.push(i);
                cooCols.push(col);
                cooVals.push(val);
            }
        }

        if (i % 1000 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / numRows) * 100) });
        }
    }

    const cooCResult = {
        rows: cooRows,
        cols: cooCols,
        values: cooVals
    };

    return cooToCSR(cooCResult, numRows, numCols);
}

/**
 * Generate random sparse matrix in COO format
 */
function generateRandomSparse(numRows, numCols, density) {
    const expectedNnz = Math.floor(numRows * numCols * density / 100);
    const rows = [];
    const cols = [];
    const values = [];

    // Use set to avoid duplicates
    const seen = new Set();
    let generated = 0;

    while (generated < expectedNnz) {
        const r = Math.floor(Math.random() * numRows);
        const c = Math.floor(Math.random() * numCols);
        const key = r * numCols + c;

        if (!seen.has(key)) {
            seen.add(key);
            rows.push(r);
            cols.push(c);
            values.push(Math.random() * 20 - 10);  // Range [-10, 10]
            generated++;
        }

        if (generated % 10000 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((generated / expectedNnz) * 50) });
        }
    }

    return { rows, cols, values };
}

/**
 * Sparse matrix-vector multiplication
 */
function sparseMatVec(data) {
    const { coo, numRows, numCols } = data;
    const startTime = performance.now();

    // Convert to CSR
    const csr = cooToCSR(coo, numRows, numCols);

    // Generate random dense vector
    const x = new Float64Array(numCols);
    for (let i = 0; i < numCols; i++) {
        x[i] = Math.random();
    }

    // Perform matrix-vector multiplication
    const y = csrMatVec(csr, x);

    const executionTime = performance.now() - startTime;

    // Compute some statistics
    let yNorm = 0;
    for (let i = 0; i < y.length; i++) {
        yNorm += y[i] * y[i];
    }
    yNorm = Math.sqrt(yNorm);

    return {
        operation: 'Sparse × Dense Vector',
        description: 'y = Ax using CSR format',
        numRows,
        numCols,
        nnz: csr.nnz,
        density: (csr.nnz / (numRows * numCols) * 100).toFixed(4),
        resultNorm: yNorm,
        resultSample: Array.from(y.slice(0, Math.min(10, y.length))),
        memoryDense: numRows * numCols * 8,
        memorySparse: (csr.values.length + csr.colIndices.length) * 8 + csr.rowPointers.length * 4,
        executionTime
    };
}

/**
 * Sparse matrix-matrix multiplication
 */
function sparseMatMul(data) {
    const { cooA, cooB, numRowsA, numColsA, numColsB } = data;
    const startTime = performance.now();

    const csrA = cooToCSR(cooA, numRowsA, numColsA);
    const csrB = cooToCSR(cooB, numColsA, numColsB);

    const csrC = csrMatMul(csrA, csrB);

    const executionTime = performance.now() - startTime;

    return {
        operation: 'Sparse × Sparse',
        description: 'C = A×B using CSR row-by-row',
        matrixA: `${numRowsA}×${numColsA}`,
        matrixB: `${numColsA}×${numColsB}`,
        matrixC: `${csrC.numRows}×${csrC.numCols}`,
        nnzA: csrA.nnz,
        nnzB: csrB.nnz,
        nnzC: csrC.nnz,
        densityC: (csrC.nnz / (csrC.numRows * csrC.numCols) * 100).toFixed(4),
        fillRatio: (csrC.nnz / Math.max(csrA.nnz, csrB.nnz)).toFixed(2),
        executionTime
    };
}

/**
 * Transpose operation
 */
function sparseTranspose(data) {
    const { coo, numRows, numCols } = data;
    const startTime = performance.now();

    const csr = cooToCSR(coo, numRows, numCols);
    const csrT = csrTranspose(csr);

    const executionTime = performance.now() - startTime;

    return {
        operation: 'Transpose',
        description: 'A^T using CSR ↔ CSC conversion',
        originalSize: `${numRows}×${numCols}`,
        transposedSize: `${csrT.numRows}×${csrT.numCols}`,
        nnz: csr.nnz,
        executionTime
    };
}

/**
 * Addition of two sparse matrices
 */
function sparseAdd(data) {
    const { cooA, cooB, numRows, numCols } = data;
    const startTime = performance.now();

    const csrA = cooToCSR(cooA, numRows, numCols);
    const csrB = cooToCSR(cooB, numRows, numCols);
    const csrC = csrAdd(csrA, csrB);

    const executionTime = performance.now() - startTime;

    return {
        operation: 'Sparse + Sparse',
        description: 'C = A + B using sorted merge',
        matrixSize: `${numRows}×${numCols}`,
        nnzA: csrA.nnz,
        nnzB: csrB.nnz,
        nnzC: csrC.nnz,
        executionTime
    };
}

/**
 * Benchmark all operations
 */
function benchmark(data) {
    const { coo, numRows, numCols } = data;
    const results = [];

    // Convert to CSR once
    postMessage({ type: 'progress', percentage: 10 });
    const csr = cooToCSR(coo, numRows, numCols);

    // Benchmark mat-vec
    postMessage({ type: 'progress', percentage: 20 });
    const x = new Float64Array(numCols);
    for (let i = 0; i < numCols; i++) x[i] = Math.random();

    let start = performance.now();
    for (let iter = 0; iter < 10; iter++) {
        csrMatVec(csr, x);
    }
    results.push({
        name: 'Mat-Vec (×10)',
        time: ((performance.now() - start) / 10).toFixed(2),
        flops: formatFlops(2 * csr.nnz, (performance.now() - start) / 10)
    });

    // Benchmark transpose
    postMessage({ type: 'progress', percentage: 40 });
    start = performance.now();
    for (let iter = 0; iter < 10; iter++) {
        csrTranspose(csr);
    }
    results.push({
        name: 'Transpose (×10)',
        time: ((performance.now() - start) / 10).toFixed(2),
        flops: '-'
    });

    // Benchmark mat-mul (smaller matrices)
    postMessage({ type: 'progress', percentage: 60 });
    if (numRows <= 2000 && numCols <= 2000) {
        start = performance.now();
        csrMatMul(csr, csr);
        results.push({
            name: 'Mat-Mat (A×A)',
            time: (performance.now() - start).toFixed(2),
            flops: '-'
        });
    }

    // Benchmark add
    postMessage({ type: 'progress', percentage: 80 });
    start = performance.now();
    for (let iter = 0; iter < 10; iter++) {
        csrAdd(csr, csr);
    }
    results.push({
        name: 'Add (×10)',
        time: ((performance.now() - start) / 10).toFixed(2),
        flops: '-'
    });

    postMessage({ type: 'progress', percentage: 100 });

    return {
        operation: 'Benchmark',
        description: 'Performance comparison of sparse operations',
        matrixSize: `${numRows}×${numCols}`,
        nnz: csr.nnz,
        density: (csr.nnz / (numRows * numCols) * 100).toFixed(4),
        benchmarks: results,
        memoryDense: formatBytes(numRows * numCols * 8),
        memorySparse: formatBytes((csr.values.length + csr.colIndices.length) * 8 + csr.rowPointers.length * 4),
        memorySavings: ((1 - ((csr.values.length + csr.colIndices.length) * 8 + csr.rowPointers.length * 4) / (numRows * numCols * 8)) * 100).toFixed(1)
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

        switch (type) {
            case 'multiply':
                result = sparseMatVec(data);
                break;
            case 'matmul':
                result = sparseMatMul(data);
                break;
            case 'transpose':
                result = sparseTranspose(data);
                break;
            case 'add':
                result = sparseAdd(data);
                break;
            case 'benchmark':
                result = benchmark(data);
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
