/**
 * Web Worker: Matrix Rank
 * Row Echelon Form, SVD-based, and QR methods
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'rowEchelon':
                result = rowEchelonRank(data.matrix, data.tolerance);
                break;
            case 'svd':
                result = svdRank(data.matrix, data.tolerance);
                break;
            case 'qr':
                result = qrRank(data.matrix, data.tolerance);
                break;
            case 'compare':
                result = compareAlgorithms(data.matrix, data.tolerance);
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
 * Row Echelon Form (Gaussian Elimination with Pivoting)
 */
function rowEchelonRank(A, tolerance = 1e-10) {
    const m = A.length;
    const n = A[0].length;

    // Create a copy
    const U = A.map(row => [...row]);
    let rank = 0;
    let pivotPositions = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    let pivotCol = 0;
    for (let row = 0; row < m && pivotCol < n; row++) {
        // Find pivot
        let maxRow = row;
        let maxVal = Math.abs(U[row][pivotCol]);

        for (let i = row + 1; i < m; i++) {
            if (Math.abs(U[i][pivotCol]) > maxVal) {
                maxVal = Math.abs(U[i][pivotCol]);
                maxRow = i;
            }
        }

        if (maxVal < tolerance) {
            // No pivot in this column, try next
            pivotCol++;
            row--;
            continue;
        }

        // Swap rows
        if (maxRow !== row) {
            [U[row], U[maxRow]] = [U[maxRow], U[row]];
        }

        pivotPositions.push({ row, col: pivotCol });
        rank++;

        // Eliminate below
        for (let i = row + 1; i < m; i++) {
            const factor = U[i][pivotCol] / U[row][pivotCol];
            U[i][pivotCol] = 0;
            for (let j = pivotCol + 1; j < n; j++) {
                U[i][j] -= factor * U[row][j];
            }
        }

        pivotCol++;

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((row / m) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Calculate nullity
    const nullity = n - rank;

    return {
        algorithm: 'Row Echelon Form',
        complexity: 'O(mn²)',
        rank: rank,
        nullity: nullity,
        dimensions: { rows: m, cols: n },
        maxPossibleRank: Math.min(m, n),
        isFullRank: rank === Math.min(m, n),
        rowEchelonForm: U,
        pivotPositions: pivotPositions,
        tolerance: tolerance,
        description: 'Gaussian elimination to find number of non-zero rows in REF'
    };
}

/**
 * SVD-based Rank (Most numerically stable)
 */
function svdRank(A, tolerance = 1e-10) {
    const m = A.length;
    const n = A[0].length;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Compute A^T * A for eigenvalue decomposition
    const AtA = [];
    for (let i = 0; i < n; i++) {
        AtA[i] = new Array(n).fill(0);
        for (let j = 0; j < n; j++) {
            for (let k = 0; k < m; k++) {
                AtA[i][j] += A[k][i] * A[k][j];
            }
        }
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    // Power iteration for singular values (simplified SVD)
    const singularValues = computeSingularValues(A, AtA, Math.min(m, n));

    self.postMessage({ type: 'progress', percentage: 80 });

    // Count non-zero singular values
    const maxSV = Math.max(...singularValues);
    const effectiveTolerance = tolerance * maxSV;
    let rank = 0;

    for (const sv of singularValues) {
        if (sv > effectiveTolerance) {
            rank++;
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const nullity = n - rank;

    return {
        algorithm: 'SVD-based Rank',
        complexity: 'O(mn²)',
        rank: rank,
        nullity: nullity,
        dimensions: { rows: m, cols: n },
        maxPossibleRank: Math.min(m, n),
        isFullRank: rank === Math.min(m, n),
        singularValues: singularValues.slice(0, 10), // Top 10
        conditionNumber: singularValues[0] / singularValues[rank - 1] || Infinity,
        tolerance: effectiveTolerance,
        description: 'Count non-zero singular values (most numerically stable)'
    };
}

/**
 * QR Decomposition based Rank
 */
function qrRank(A, tolerance = 1e-10) {
    const m = A.length;
    const n = A[0].length;

    self.postMessage({ type: 'progress', percentage: 10 });

    // QR decomposition with column pivoting
    const { R, pivots } = qrWithPivoting(A);

    self.postMessage({ type: 'progress', percentage: 80 });

    // Count non-zero diagonal elements of R
    let rank = 0;
    const diagonalElements = [];
    const minDim = Math.min(m, n);

    for (let i = 0; i < minDim; i++) {
        const diagVal = Math.abs(R[i][i]);
        diagonalElements.push(diagVal);
        if (diagVal > tolerance) {
            rank++;
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const nullity = n - rank;

    return {
        algorithm: 'QR Decomposition',
        complexity: 'O(mn²)',
        rank: rank,
        nullity: nullity,
        dimensions: { rows: m, cols: n },
        maxPossibleRank: Math.min(m, n),
        isFullRank: rank === Math.min(m, n),
        diagonalR: diagonalElements.slice(0, 10),
        tolerance: tolerance,
        description: 'Count non-zero diagonal elements of R in QR decomposition'
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A, tolerance) {
    const m = A.length;
    const n = A[0].length;
    const results = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    // Row Echelon
    const refStart = performance.now();
    const refResult = rowEchelonRank(A, tolerance);
    const refTime = performance.now() - refStart;
    results.push({
        algorithm: 'Row Echelon',
        rank: refResult.rank,
        time: refTime.toFixed(2)
    });

    self.postMessage({ type: 'progress', percentage: 40 });

    // SVD
    const svdStart = performance.now();
    const svdResult = svdRank(A, tolerance);
    const svdTime = performance.now() - svdStart;
    results.push({
        algorithm: 'SVD',
        rank: svdResult.rank,
        time: svdTime.toFixed(2)
    });

    self.postMessage({ type: 'progress', percentage: 70 });

    // QR
    const qrStart = performance.now();
    const qrResult = qrRank(A, tolerance);
    const qrTime = performance.now() - qrStart;
    results.push({
        algorithm: 'QR',
        rank: qrResult.rank,
        time: qrTime.toFixed(2)
    });

    self.postMessage({ type: 'progress', percentage: 100 });

    // Check if all methods agree
    const allAgree = results.every(r => r.rank === results[0].rank);

    return {
        algorithm: 'Algorithm Comparison',
        rank: svdResult.rank, // SVD is most reliable
        nullity: n - svdResult.rank,
        dimensions: { rows: m, cols: n },
        maxPossibleRank: Math.min(m, n),
        isFullRank: svdResult.rank === Math.min(m, n),
        comparison: results,
        allAgree: allAgree,
        singularValues: svdResult.singularValues,
        conditionNumber: svdResult.conditionNumber,
        description: 'Comparison of different rank computation methods'
    };
}

// ========== Helper Functions ==========

function computeSingularValues(A, AtA, numValues) {
    const n = AtA.length;
    const singularValues = [];

    // Simplified: compute eigenvalues of A^T*A using power iteration
    let B = AtA.map(row => [...row]);

    for (let k = 0; k < numValues; k++) {
        // Power iteration for largest eigenvalue
        let v = new Array(n).fill(1);
        let eigenvalue = 0;

        for (let iter = 0; iter < 100; iter++) {
            // v = B * v
            const newV = new Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    newV[i] += B[i][j] * v[j];
                }
            }

            // Normalize
            let norm = 0;
            for (let i = 0; i < n; i++) {
                norm += newV[i] * newV[i];
            }
            norm = Math.sqrt(norm);

            if (norm < 1e-14) break;

            const prevEig = eigenvalue;
            eigenvalue = norm;

            for (let i = 0; i < n; i++) {
                v[i] = newV[i] / norm;
            }

            if (Math.abs(eigenvalue - prevEig) < 1e-12 * eigenvalue) break;
        }

        singularValues.push(Math.sqrt(Math.max(0, eigenvalue)));

        // Deflate: B = B - eigenvalue * v * v^T
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                B[i][j] -= eigenvalue * v[i] * v[j];
            }
        }
    }

    return singularValues.sort((a, b) => b - a);
}

function qrWithPivoting(A) {
    const m = A.length;
    const n = A[0].length;

    const R = A.map(row => [...row]);
    const pivots = [];

    for (let k = 0; k < Math.min(m, n); k++) {
        // Find column with maximum norm
        let maxNorm = 0;
        let maxCol = k;

        for (let j = k; j < n; j++) {
            let norm = 0;
            for (let i = k; i < m; i++) {
                norm += R[i][j] * R[i][j];
            }
            if (norm > maxNorm) {
                maxNorm = norm;
                maxCol = j;
            }
        }

        // Swap columns
        if (maxCol !== k) {
            for (let i = 0; i < m; i++) {
                [R[i][k], R[i][maxCol]] = [R[i][maxCol], R[i][k]];
            }
        }
        pivots.push(maxCol);

        // Householder reflection
        let norm = 0;
        for (let i = k; i < m; i++) {
            norm += R[i][k] * R[i][k];
        }
        norm = Math.sqrt(norm);

        if (norm < 1e-14) continue;

        const sign = R[k][k] >= 0 ? 1 : -1;
        const u0 = R[k][k] + sign * norm;

        const u = new Array(m - k);
        u[0] = 1;
        for (let i = 1; i < m - k; i++) {
            u[i] = R[k + i][k] / u0;
        }

        const beta = 2 / (1 + u.slice(1).reduce((s, x) => s + x * x, 0));

        // Apply reflection
        for (let j = k; j < n; j++) {
            let dot = 0;
            for (let i = 0; i < m - k; i++) {
                dot += u[i] * R[k + i][j];
            }
            for (let i = 0; i < m - k; i++) {
                R[k + i][j] -= beta * u[i] * dot;
            }
        }
    }

    return { R, pivots };
}
