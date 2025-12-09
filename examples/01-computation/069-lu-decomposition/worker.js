/**
 * Web Worker: LU Decomposition
 * Doolittle, Crout, and LUP methods
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'doolittle':
                result = doolittleLU(data.matrix);
                break;
            case 'crout':
                result = croutLU(data.matrix);
                break;
            case 'lup':
                result = lupDecomposition(data.matrix);
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
 * Doolittle LU Decomposition - L has 1s on diagonal
 */
function doolittleLU(A) {
    const n = A.length;

    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    const L = [];
    const U = [];

    // Initialize L and U
    for (let i = 0; i < n; i++) {
        L[i] = new Array(n).fill(0);
        U[i] = new Array(n).fill(0);
        L[i][i] = 1; // Doolittle: L has 1s on diagonal
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let i = 0; i < n; i++) {
        // Upper triangular U
        for (let k = i; k < n; k++) {
            let sum = 0;
            for (let j = 0; j < i; j++) {
                sum += L[i][j] * U[j][k];
            }
            U[i][k] = A[i][k] - sum;
        }

        // Lower triangular L
        for (let k = i + 1; k < n; k++) {
            let sum = 0;
            for (let j = 0; j < i; j++) {
                sum += L[k][j] * U[j][i];
            }
            if (Math.abs(U[i][i]) < 1e-14) {
                throw new Error('Zero pivot encountered. Matrix may need pivoting.');
            }
            L[k][i] = (A[k][i] - sum) / U[i][i];
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((i / n) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Verify: L * U should equal A
    const verification = verifyLU(L, U, A);

    // Calculate determinant
    let det = 1;
    for (let i = 0; i < n; i++) {
        det *= U[i][i];
    }

    return {
        algorithm: 'Doolittle LU',
        description: 'L has 1s on diagonal, U is upper triangular',
        L: L,
        U: U,
        P: null,
        matrixSize: n,
        determinant: det,
        verification: verification,
        lDiagonal: '1s (by definition)',
        uDiagonal: U.map((row, i) => row[i])
    };
}

/**
 * Crout LU Decomposition - U has 1s on diagonal
 */
function croutLU(A) {
    const n = A.length;

    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    const L = [];
    const U = [];

    // Initialize L and U
    for (let i = 0; i < n; i++) {
        L[i] = new Array(n).fill(0);
        U[i] = new Array(n).fill(0);
        U[i][i] = 1; // Crout: U has 1s on diagonal
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let j = 0; j < n; j++) {
        // Lower triangular L (column j)
        for (let i = j; i < n; i++) {
            let sum = 0;
            for (let k = 0; k < j; k++) {
                sum += L[i][k] * U[k][j];
            }
            L[i][j] = A[i][j] - sum;
        }

        // Upper triangular U (row j)
        for (let i = j + 1; i < n; i++) {
            let sum = 0;
            for (let k = 0; k < j; k++) {
                sum += L[j][k] * U[k][i];
            }
            if (Math.abs(L[j][j]) < 1e-14) {
                throw new Error('Zero pivot encountered. Matrix may need pivoting.');
            }
            U[j][i] = (A[j][i] - sum) / L[j][j];
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((j / n) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifyLU(L, U, A);

    let det = 1;
    for (let i = 0; i < n; i++) {
        det *= L[i][i];
    }

    return {
        algorithm: 'Crout LU',
        description: 'L is lower triangular, U has 1s on diagonal',
        L: L,
        U: U,
        P: null,
        matrixSize: n,
        determinant: det,
        verification: verification,
        lDiagonal: L.map((row, i) => row[i]),
        uDiagonal: '1s (by definition)'
    };
}

/**
 * LUP Decomposition with Partial Pivoting
 */
function lupDecomposition(A) {
    const n = A.length;

    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    // Create working copy
    const LU = A.map(row => [...row]);
    const P = []; // Permutation vector
    for (let i = 0; i < n; i++) P[i] = i;

    let swaps = 0;

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let k = 0; k < n - 1; k++) {
        // Find pivot
        let maxVal = Math.abs(LU[k][k]);
        let maxRow = k;

        for (let i = k + 1; i < n; i++) {
            if (Math.abs(LU[i][k]) > maxVal) {
                maxVal = Math.abs(LU[i][k]);
                maxRow = i;
            }
        }

        if (maxVal < 1e-14) {
            throw new Error('Matrix is singular');
        }

        // Swap rows if needed
        if (maxRow !== k) {
            [LU[k], LU[maxRow]] = [LU[maxRow], LU[k]];
            [P[k], P[maxRow]] = [P[maxRow], P[k]];
            swaps++;
        }

        // Elimination
        for (let i = k + 1; i < n; i++) {
            LU[i][k] /= LU[k][k];
            for (let j = k + 1; j < n; j++) {
                LU[i][j] -= LU[i][k] * LU[k][j];
            }
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((k / n) * 80)
        });
    }

    // Extract L and U from combined matrix
    const L = [];
    const U = [];
    for (let i = 0; i < n; i++) {
        L[i] = new Array(n).fill(0);
        U[i] = new Array(n).fill(0);
        L[i][i] = 1;
        for (let j = 0; j < n; j++) {
            if (j < i) {
                L[i][j] = LU[i][j];
            } else {
                U[i][j] = LU[i][j];
            }
        }
    }

    // Create permutation matrix
    const Pmatrix = [];
    for (let i = 0; i < n; i++) {
        Pmatrix[i] = new Array(n).fill(0);
        Pmatrix[i][P[i]] = 1;
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Verify: P * A = L * U
    const PA = [];
    for (let i = 0; i < n; i++) {
        PA[i] = [...A[P[i]]];
    }
    const verification = verifyLU(L, U, PA);

    // Determinant with sign from permutation
    let det = (swaps % 2 === 0) ? 1 : -1;
    for (let i = 0; i < n; i++) {
        det *= U[i][i];
    }

    return {
        algorithm: 'LUP with Partial Pivoting',
        description: 'PA = LU with row permutation for numerical stability',
        L: L,
        U: U,
        P: P,
        Pmatrix: Pmatrix,
        matrixSize: n,
        determinant: det,
        swaps: swaps,
        verification: verification,
        lDiagonal: '1s (by definition)',
        uDiagonal: U.map((row, i) => row[i])
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A) {
    const n = A.length;
    const results = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    // Doolittle
    try {
        const dStart = performance.now();
        const dResult = doolittleLU(A);
        const dTime = performance.now() - dStart;
        results.push({
            algorithm: 'Doolittle',
            time: dTime.toFixed(2),
            error: dResult.verification.maxError.toExponential(2),
            det: dResult.determinant,
            success: true
        });
    } catch (e) {
        results.push({
            algorithm: 'Doolittle',
            error: e.message,
            success: false
        });
    }

    self.postMessage({ type: 'progress', percentage: 40 });

    // Crout
    try {
        const cStart = performance.now();
        const cResult = croutLU(A);
        const cTime = performance.now() - cStart;
        results.push({
            algorithm: 'Crout',
            time: cTime.toFixed(2),
            error: cResult.verification.maxError.toExponential(2),
            det: cResult.determinant,
            success: true
        });
    } catch (e) {
        results.push({
            algorithm: 'Crout',
            error: e.message,
            success: false
        });
    }

    self.postMessage({ type: 'progress', percentage: 70 });

    // LUP
    try {
        const lupStart = performance.now();
        const lupResult = lupDecomposition(A);
        const lupTime = performance.now() - lupStart;
        results.push({
            algorithm: 'LUP',
            time: lupTime.toFixed(2),
            error: lupResult.verification.maxError.toExponential(2),
            det: lupResult.determinant,
            swaps: lupResult.swaps,
            success: true
        });
    } catch (e) {
        results.push({
            algorithm: 'LUP',
            error: e.message,
            success: false
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Get best result
    let bestResult = null;
    try {
        bestResult = lupDecomposition(A);
    } catch (e) {
        // Use first successful method
    }

    return {
        algorithm: 'Algorithm Comparison',
        comparison: results,
        L: bestResult?.L,
        U: bestResult?.U,
        P: bestResult?.P,
        matrixSize: n,
        determinant: bestResult?.determinant,
        description: 'Comparison of LU decomposition methods'
    };
}

// ========== Helper Functions ==========

function verifyLU(L, U, A) {
    const n = L.length;
    const product = [];
    let maxError = 0;

    for (let i = 0; i < n; i++) {
        product[i] = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += L[i][k] * U[k][j];
            }
            product[i][j] = sum;
            maxError = Math.max(maxError, Math.abs(sum - A[i][j]));
        }
    }

    return {
        product: product,
        maxError: maxError,
        isValid: maxError < 1e-10
    };
}
