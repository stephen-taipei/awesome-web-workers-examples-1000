/**
 * Web Worker: Cholesky Decomposition
 * For symmetric positive definite matrices
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'cholesky':
                result = standardCholesky(data.matrix);
                break;
            case 'ldl':
                result = ldlDecomposition(data.matrix);
                break;
            case 'choleskyBanachiewicz':
                result = choleskyBanachiewicz(data.matrix);
                break;
            case 'choleskyCrout':
                result = choleskyCrout(data.matrix);
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
 * Validate symmetric positive definite matrix
 */
function validateSPD(A) {
    const n = A.length;

    // Check square
    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    // Check symmetric
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(A[i][j] - A[j][i]) > 1e-10) {
                throw new Error('Matrix must be symmetric');
            }
        }
    }

    return true;
}

/**
 * Standard Cholesky decomposition: A = LL^T
 * Row-by-row computation
 */
function standardCholesky(A) {
    validateSPD(A);
    const n = A.length;

    const L = [];
    for (let i = 0; i < n; i++) {
        L[i] = new Array(n).fill(0);
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;

            if (j === i) {
                // Diagonal elements
                for (let k = 0; k < j; k++) {
                    sum += L[j][k] * L[j][k];
                }
                const val = A[j][j] - sum;
                if (val <= 0) {
                    throw new Error('Matrix is not positive definite');
                }
                L[j][j] = Math.sqrt(val);
            } else {
                // Off-diagonal elements
                for (let k = 0; k < j; k++) {
                    sum += L[i][k] * L[j][k];
                }
                L[i][j] = (A[i][j] - sum) / L[j][j];
            }
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((i / n) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifyCholesky(L, A);
    const determinant = computeDeterminant(L);

    return {
        algorithm: 'Standard Cholesky',
        description: 'A = LL^T decomposition, row-by-row',
        L: L,
        matrixSize: n,
        determinant: determinant,
        verification: verification,
        diagonal: L.map((row, i) => row[i])
    };
}

/**
 * LDL^T decomposition: A = LDL^T
 * L has 1s on diagonal, D is diagonal
 */
function ldlDecomposition(A) {
    validateSPD(A);
    const n = A.length;

    const L = [];
    const D = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
        L[i] = new Array(n).fill(0);
        L[i][i] = 1;
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let j = 0; j < n; j++) {
        // Compute D[j]
        let sum = 0;
        for (let k = 0; k < j; k++) {
            sum += L[j][k] * L[j][k] * D[k];
        }
        D[j] = A[j][j] - sum;

        if (D[j] <= 0) {
            throw new Error('Matrix is not positive definite');
        }

        // Compute L[i][j] for i > j
        for (let i = j + 1; i < n; i++) {
            sum = 0;
            for (let k = 0; k < j; k++) {
                sum += L[i][k] * L[j][k] * D[k];
            }
            L[i][j] = (A[i][j] - sum) / D[j];
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((j / n) * 80)
        });
    }

    // Create D matrix for display
    const Dmatrix = [];
    for (let i = 0; i < n; i++) {
        Dmatrix[i] = new Array(n).fill(0);
        Dmatrix[i][i] = D[i];
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifyLDL(L, D, A);
    let determinant = 1;
    for (let i = 0; i < n; i++) {
        determinant *= D[i];
    }

    return {
        algorithm: 'LDL^T Decomposition',
        description: 'A = LDL^T, avoids square roots',
        L: L,
        D: D,
        Dmatrix: Dmatrix,
        matrixSize: n,
        determinant: determinant,
        verification: verification,
        diagonal: D
    };
}

/**
 * Cholesky-Banachiewicz algorithm (row-oriented)
 */
function choleskyBanachiewicz(A) {
    validateSPD(A);
    const n = A.length;

    const L = [];
    for (let i = 0; i < n; i++) {
        L[i] = new Array(n).fill(0);
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;

            for (let k = 0; k < j; k++) {
                sum += L[i][k] * L[j][k];
            }

            if (i === j) {
                const val = A[i][i] - sum;
                if (val <= 0) {
                    throw new Error('Matrix is not positive definite');
                }
                L[i][j] = Math.sqrt(val);
            } else {
                L[i][j] = (A[i][j] - sum) / L[j][j];
            }
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((i / n) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifyCholesky(L, A);
    const determinant = computeDeterminant(L);

    return {
        algorithm: 'Cholesky-Banachiewicz',
        description: 'Row-oriented A = LL^T computation',
        L: L,
        matrixSize: n,
        determinant: determinant,
        verification: verification,
        diagonal: L.map((row, i) => row[i])
    };
}

/**
 * Cholesky-Crout algorithm (column-oriented)
 */
function choleskyCrout(A) {
    validateSPD(A);
    const n = A.length;

    const L = [];
    for (let i = 0; i < n; i++) {
        L[i] = new Array(n).fill(0);
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let j = 0; j < n; j++) {
        // Compute diagonal element
        let sum = 0;
        for (let k = 0; k < j; k++) {
            sum += L[j][k] * L[j][k];
        }
        const val = A[j][j] - sum;
        if (val <= 0) {
            throw new Error('Matrix is not positive definite');
        }
        L[j][j] = Math.sqrt(val);

        // Compute elements below diagonal in column j
        for (let i = j + 1; i < n; i++) {
            sum = 0;
            for (let k = 0; k < j; k++) {
                sum += L[i][k] * L[j][k];
            }
            L[i][j] = (A[i][j] - sum) / L[j][j];
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((j / n) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifyCholesky(L, A);
    const determinant = computeDeterminant(L);

    return {
        algorithm: 'Cholesky-Crout',
        description: 'Column-oriented A = LL^T computation',
        L: L,
        matrixSize: n,
        determinant: determinant,
        verification: verification,
        diagonal: L.map((row, i) => row[i])
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A) {
    const n = A.length;
    const results = [];

    self.postMessage({ type: 'progress', percentage: 5 });

    // Standard Cholesky
    try {
        const start = performance.now();
        const res = standardCholesky(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Standard',
            time: time.toFixed(2),
            error: res.verification.maxError.toExponential(2),
            det: res.determinant,
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Standard', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 25 });

    // LDL
    try {
        const start = performance.now();
        const res = ldlDecomposition(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'LDL^T',
            time: time.toFixed(2),
            error: res.verification.maxError.toExponential(2),
            det: res.determinant,
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'LDL^T', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 50 });

    // Banachiewicz
    try {
        const start = performance.now();
        const res = choleskyBanachiewicz(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Banachiewicz',
            time: time.toFixed(2),
            error: res.verification.maxError.toExponential(2),
            det: res.determinant,
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Banachiewicz', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 75 });

    // Crout
    try {
        const start = performance.now();
        const res = choleskyCrout(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Crout',
            time: time.toFixed(2),
            error: res.verification.maxError.toExponential(2),
            det: res.determinant,
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Crout', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Get best result
    let bestResult = null;
    try {
        bestResult = standardCholesky(A);
    } catch (e) {
        // fallback
    }

    return {
        algorithm: 'Algorithm Comparison',
        comparison: results,
        L: bestResult?.L,
        matrixSize: n,
        determinant: bestResult?.determinant,
        description: 'Comparison of Cholesky decomposition methods'
    };
}

// ========== Helper Functions ==========

function verifyCholesky(L, A) {
    const n = L.length;
    let maxError = 0;

    // Compute L * L^T
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += L[i][k] * L[j][k]; // L * L^T
            }
            maxError = Math.max(maxError, Math.abs(sum - A[i][j]));
        }
    }

    return {
        maxError: maxError,
        isValid: maxError < 1e-10
    };
}

function verifyLDL(L, D, A) {
    const n = L.length;
    let maxError = 0;

    // Compute L * D * L^T
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += L[i][k] * D[k] * L[j][k];
            }
            maxError = Math.max(maxError, Math.abs(sum - A[i][j]));
        }
    }

    return {
        maxError: maxError,
        isValid: maxError < 1e-10
    };
}

function computeDeterminant(L) {
    let det = 1;
    for (let i = 0; i < L.length; i++) {
        det *= L[i][i];
    }
    return det * det; // det(A) = det(L)^2
}
