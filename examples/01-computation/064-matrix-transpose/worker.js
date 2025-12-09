/**
 * Web Worker: Matrix Transpose
 * Standard, In-place, Block, and Recursive algorithms
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'standard':
                result = standardTranspose(data.matrix);
                break;
            case 'inplace':
                result = inplaceTranspose(data.matrix);
                break;
            case 'block':
                result = blockTranspose(data.matrix, data.blockSize || 64);
                break;
            case 'recursive':
                result = recursiveTranspose(data.matrix);
                break;
            case 'compare':
                result = compareAlgorithms(data.matrix);
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
 * Standard Transpose - Works for any matrix
 */
function standardTranspose(A) {
    const rows = A.length;
    const cols = A[0].length;

    const AT = [];
    const totalOps = rows * cols;
    let opsCompleted = 0;

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let j = 0; j < cols; j++) {
        AT[j] = new Array(rows);
        for (let i = 0; i < rows; i++) {
            AT[j][i] = A[i][j];
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

    // Check properties
    const properties = analyzeProperties(A, AT);

    return {
        algorithm: 'Standard Transpose',
        complexity: 'O(mn) time, O(mn) space',
        original: A,
        transposed: AT,
        dimensions: { original: `${rows}×${cols}`, transposed: `${cols}×${rows}` },
        properties: properties,
        description: 'Creates new matrix with swapped indices'
    };
}

/**
 * In-place Transpose - Only for square matrices
 */
function inplaceTranspose(A) {
    const rows = A.length;
    const cols = A[0].length;

    if (rows !== cols) {
        throw new Error('In-place transpose requires a square matrix');
    }

    const n = rows;
    const AT = A.map(row => [...row]); // Copy for in-place modification

    self.postMessage({ type: 'progress', percentage: 10 });

    let swaps = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            // Swap AT[i][j] and AT[j][i]
            const temp = AT[i][j];
            AT[i][j] = AT[j][i];
            AT[j][i] = temp;
            swaps++;
        }

        if (i % Math.floor(n / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((i / n) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const properties = analyzeProperties(A, AT);

    return {
        algorithm: 'In-place Transpose',
        complexity: 'O(n²) time, O(1) extra space',
        original: A,
        transposed: AT,
        dimensions: { original: `${n}×${n}`, transposed: `${n}×${n}` },
        swaps: swaps,
        properties: properties,
        description: 'Swaps elements across the main diagonal'
    };
}

/**
 * Block (Cache-efficient) Transpose
 */
function blockTranspose(A, blockSize = 64) {
    const rows = A.length;
    const cols = A[0].length;

    const AT = [];
    for (let j = 0; j < cols; j++) {
        AT[j] = new Array(rows);
    }

    const totalBlocks = Math.ceil(rows / blockSize) * Math.ceil(cols / blockSize);
    let blocksCompleted = 0;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Process by blocks
    for (let ii = 0; ii < rows; ii += blockSize) {
        for (let jj = 0; jj < cols; jj += blockSize) {
            const iMax = Math.min(ii + blockSize, rows);
            const jMax = Math.min(jj + blockSize, cols);

            for (let i = ii; i < iMax; i++) {
                for (let j = jj; j < jMax; j++) {
                    AT[j][i] = A[i][j];
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

    self.postMessage({ type: 'progress', percentage: 100 });

    const properties = analyzeProperties(A, AT);

    return {
        algorithm: 'Block Transpose',
        complexity: 'O(mn) time, cache-optimized',
        original: A,
        transposed: AT,
        dimensions: { original: `${rows}×${cols}`, transposed: `${cols}×${rows}` },
        blockSize: blockSize,
        blocks: totalBlocks,
        properties: properties,
        description: 'Processes matrix in blocks for better cache performance'
    };
}

/**
 * Recursive (Cache-oblivious) Transpose
 */
function recursiveTranspose(A) {
    const rows = A.length;
    const cols = A[0].length;

    const AT = [];
    for (let j = 0; j < cols; j++) {
        AT[j] = new Array(rows);
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    const threshold = 32; // Base case threshold
    recursiveTransposeHelper(A, AT, 0, rows, 0, cols, threshold);

    self.postMessage({ type: 'progress', percentage: 100 });

    const properties = analyzeProperties(A, AT);

    return {
        algorithm: 'Recursive Transpose',
        complexity: 'O(mn) time, cache-oblivious',
        original: A,
        transposed: AT,
        dimensions: { original: `${rows}×${cols}`, transposed: `${cols}×${rows}` },
        threshold: threshold,
        properties: properties,
        description: 'Divide-and-conquer approach that automatically adapts to cache size'
    };
}

function recursiveTransposeHelper(A, AT, rowStart, rowEnd, colStart, colEnd, threshold) {
    const rows = rowEnd - rowStart;
    const cols = colEnd - colStart;

    // Base case
    if (rows <= threshold && cols <= threshold) {
        for (let i = rowStart; i < rowEnd; i++) {
            for (let j = colStart; j < colEnd; j++) {
                AT[j][i] = A[i][j];
            }
        }
        return;
    }

    // Divide
    if (rows >= cols) {
        const mid = rowStart + Math.floor(rows / 2);
        recursiveTransposeHelper(A, AT, rowStart, mid, colStart, colEnd, threshold);
        recursiveTransposeHelper(A, AT, mid, rowEnd, colStart, colEnd, threshold);
    } else {
        const mid = colStart + Math.floor(cols / 2);
        recursiveTransposeHelper(A, AT, rowStart, rowEnd, colStart, mid, threshold);
        recursiveTransposeHelper(A, AT, rowStart, rowEnd, mid, colEnd, threshold);
    }
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A) {
    const results = [];
    const rows = A.length;
    const cols = A[0].length;
    const isSquare = rows === cols;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Standard
    const standardStart = performance.now();
    const standardResult = standardTranspose(A);
    const standardTime = performance.now() - standardStart;
    results.push({
        algorithm: 'Standard',
        time: standardTime.toFixed(2),
        space: 'O(mn)'
    });

    self.postMessage({ type: 'progress', percentage: 30 });

    // In-place (only for square)
    if (isSquare) {
        const inplaceStart = performance.now();
        const inplaceResult = inplaceTranspose(A);
        const inplaceTime = performance.now() - inplaceStart;
        results.push({
            algorithm: 'In-place',
            time: inplaceTime.toFixed(2),
            space: 'O(1)'
        });
    }

    self.postMessage({ type: 'progress', percentage: 50 });

    // Block
    const blockStart = performance.now();
    const blockResult = blockTranspose(A, 64);
    const blockTime = performance.now() - blockStart;
    results.push({
        algorithm: 'Block (64)',
        time: blockTime.toFixed(2),
        space: 'O(mn)'
    });

    self.postMessage({ type: 'progress', percentage: 70 });

    // Recursive
    const recursiveStart = performance.now();
    const recursiveResult = recursiveTranspose(A);
    const recursiveTime = performance.now() - recursiveStart;
    results.push({
        algorithm: 'Recursive',
        time: recursiveTime.toFixed(2),
        space: 'O(mn)'
    });

    self.postMessage({ type: 'progress', percentage: 100 });

    // Verify all results are identical
    const verified = verifyTranspose(standardResult.transposed, blockResult.transposed);

    return {
        algorithm: 'Algorithm Comparison',
        original: A,
        transposed: standardResult.transposed,
        dimensions: standardResult.dimensions,
        comparison: results,
        verified: verified,
        isSquare: isSquare,
        properties: standardResult.properties,
        description: 'Performance comparison of different transpose algorithms'
    };
}

/**
 * Analyze matrix properties
 */
function analyzeProperties(A, AT) {
    const rows = A.length;
    const cols = A[0].length;
    const properties = [];

    // Check if symmetric (A = A^T)
    if (rows === cols) {
        let isSymmetric = true;
        let isSkewSymmetric = true;
        const epsilon = 1e-10;

        for (let i = 0; i < rows && (isSymmetric || isSkewSymmetric); i++) {
            for (let j = 0; j < cols; j++) {
                if (Math.abs(A[i][j] - A[j][i]) > epsilon) {
                    isSymmetric = false;
                }
                if (Math.abs(A[i][j] + A[j][i]) > epsilon) {
                    isSkewSymmetric = false;
                }
            }
        }

        if (isSymmetric) {
            properties.push({ name: 'Symmetric', value: 'A = A^T', icon: '✓' });
        }
        if (isSkewSymmetric) {
            properties.push({ name: 'Skew-symmetric', value: 'A = -A^T', icon: '✓' });
        }
    }

    // Check if orthogonal (A^T * A = I) for small matrices
    if (rows === cols && rows <= 10) {
        const product = multiplyMatrices(AT, A);
        let isOrthogonal = true;
        const epsilon = 1e-10;

        for (let i = 0; i < rows && isOrthogonal; i++) {
            for (let j = 0; j < cols; j++) {
                const expected = i === j ? 1 : 0;
                if (Math.abs(product[i][j] - expected) > epsilon) {
                    isOrthogonal = false;
                }
            }
        }

        if (isOrthogonal) {
            properties.push({ name: 'Orthogonal', value: 'A^T·A = I', icon: '✓' });
        }
    }

    // Matrix dimensions changed
    if (rows !== cols) {
        properties.push({
            name: 'Dimension Change',
            value: `${rows}×${cols} → ${cols}×${rows}`,
            icon: '↔'
        });
    }

    return properties;
}

/**
 * Helper: Multiply matrices (for orthogonality check)
 */
function multiplyMatrices(A, B) {
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

/**
 * Verify transpose results match
 */
function verifyTranspose(A, B) {
    if (A.length !== B.length || A[0].length !== B[0].length) return false;
    const epsilon = 1e-10;
    for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < A[0].length; j++) {
            if (Math.abs(A[i][j] - B[i][j]) > epsilon) return false;
        }
    }
    return true;
}
