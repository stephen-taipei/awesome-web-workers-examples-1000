/**
 * Web Worker: Matrix Inverse
 * Gauss-Jordan, LU Decomposition, and Adjugate methods
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'gaussJordan':
                result = gaussJordanInverse(data.matrix);
                break;
            case 'lu':
                result = luInverse(data.matrix);
                break;
            case 'adjugate':
                result = adjugateInverse(data.matrix);
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
 * Gauss-Jordan Elimination - O(n³)
 */
function gaussJordanInverse(A) {
    const n = A.length;

    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    // Create augmented matrix [A | I]
    const aug = [];
    for (let i = 0; i < n; i++) {
        aug[i] = [...A[i]];
        for (let j = 0; j < n; j++) {
            aug[i].push(i === j ? 1 : 0);
        }
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // Forward elimination with partial pivoting
    for (let col = 0; col < n; col++) {
        // Find pivot
        let maxRow = col;
        let maxVal = Math.abs(aug[col][col]);
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(aug[row][col]) > maxVal) {
                maxVal = Math.abs(aug[row][col]);
                maxRow = row;
            }
        }

        // Swap rows
        if (maxRow !== col) {
            [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
        }

        // Check for singular matrix
        if (Math.abs(aug[col][col]) < 1e-14) {
            throw new Error('Matrix is singular and cannot be inverted');
        }

        // Scale pivot row
        const pivot = aug[col][col];
        for (let j = 0; j < 2 * n; j++) {
            aug[col][j] /= pivot;
        }

        // Eliminate column
        for (let row = 0; row < n; row++) {
            if (row !== col) {
                const factor = aug[row][col];
                for (let j = 0; j < 2 * n; j++) {
                    aug[row][j] -= factor * aug[col][j];
                }
            }
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((col / n) * 80)
        });
    }

    // Extract inverse from augmented matrix
    const inverse = [];
    for (let i = 0; i < n; i++) {
        inverse[i] = aug[i].slice(n);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Verify: A * A^-1 should be identity
    const verification = verifyInverse(A, inverse);

    return {
        algorithm: 'Gauss-Jordan Elimination',
        complexity: 'O(n³)',
        original: A,
        inverse: inverse,
        matrixSize: n,
        determinant: calculateDeterminant(A),
        verification: verification,
        description: 'Row reduction on augmented matrix [A|I] to get [I|A⁻¹]'
    };
}

/**
 * LU Decomposition Method - O(n³)
 */
function luInverse(A) {
    const n = A.length;

    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // LU decomposition with partial pivoting
    const { L, U, P } = luDecomposition(A);

    self.postMessage({ type: 'progress', percentage: 40 });

    // Solve for inverse column by column
    const inverse = [];
    for (let i = 0; i < n; i++) {
        inverse[i] = new Array(n).fill(0);
    }

    for (let col = 0; col < n; col++) {
        // Create unit vector
        const e = new Array(n).fill(0);
        e[col] = 1;

        // Apply permutation
        const pe = new Array(n);
        for (let i = 0; i < n; i++) {
            pe[i] = e[P[i]];
        }

        // Forward substitution: Ly = Pe
        const y = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            y[i] = pe[i];
            for (let j = 0; j < i; j++) {
                y[i] -= L[i][j] * y[j];
            }
        }

        // Back substitution: Ux = y
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = y[i];
            for (let j = i + 1; j < n; j++) {
                x[i] -= U[i][j] * x[j];
            }
            x[i] /= U[i][i];
        }

        // Store column
        for (let i = 0; i < n; i++) {
            inverse[i][col] = x[i];
        }

        self.postMessage({
            type: 'progress',
            percentage: 40 + Math.round((col / n) * 50)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifyInverse(A, inverse);

    return {
        algorithm: 'LU Decomposition',
        complexity: 'O(n³)',
        original: A,
        inverse: inverse,
        matrixSize: n,
        determinant: calculateDeterminant(A),
        verification: verification,
        description: 'Decompose A=LU, then solve n systems for each column of inverse'
    };
}

/**
 * Adjugate (Classical Adjoint) Method - O(n!)
 * Only practical for small matrices
 */
function adjugateInverse(A) {
    const n = A.length;

    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    if (n > 6) {
        throw new Error('Adjugate method is too slow for matrices larger than 6×6');
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // Calculate determinant
    const det = calculateDeterminant(A);

    if (Math.abs(det) < 1e-14) {
        throw new Error('Matrix is singular (det = 0) and cannot be inverted');
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    // Calculate cofactor matrix
    const cofactor = [];
    for (let i = 0; i < n; i++) {
        cofactor[i] = [];
        for (let j = 0; j < n; j++) {
            const minor = getMinor(A, i, j);
            const sign = ((i + j) % 2 === 0) ? 1 : -1;
            cofactor[i][j] = sign * calculateDeterminant(minor);
        }

        self.postMessage({
            type: 'progress',
            percentage: 30 + Math.round((i / n) * 50)
        });
    }

    // Adjugate is transpose of cofactor
    const adjugate = [];
    for (let i = 0; i < n; i++) {
        adjugate[i] = [];
        for (let j = 0; j < n; j++) {
            adjugate[i][j] = cofactor[j][i];
        }
    }

    // Inverse = adjugate / det
    const inverse = [];
    for (let i = 0; i < n; i++) {
        inverse[i] = [];
        for (let j = 0; j < n; j++) {
            inverse[i][j] = adjugate[i][j] / det;
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifyInverse(A, inverse);

    return {
        algorithm: 'Adjugate Method',
        complexity: 'O(n × n!)',
        original: A,
        inverse: inverse,
        matrixSize: n,
        determinant: det,
        cofactorMatrix: cofactor,
        adjugateMatrix: adjugate,
        verification: verification,
        description: 'A⁻¹ = adj(A) / det(A), where adj(A) is transpose of cofactor matrix'
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A) {
    const n = A.length;
    const results = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    // Gauss-Jordan
    try {
        const gjStart = performance.now();
        const gjResult = gaussJordanInverse(A);
        const gjTime = performance.now() - gjStart;
        results.push({
            algorithm: 'Gauss-Jordan',
            time: gjTime.toFixed(2),
            error: gjResult.verification.maxError.toExponential(2),
            success: true
        });
    } catch (e) {
        results.push({
            algorithm: 'Gauss-Jordan',
            error: e.message,
            success: false
        });
    }

    self.postMessage({ type: 'progress', percentage: 40 });

    // LU
    try {
        const luStart = performance.now();
        const luResult = luInverse(A);
        const luTime = performance.now() - luStart;
        results.push({
            algorithm: 'LU Decomposition',
            time: luTime.toFixed(2),
            error: luResult.verification.maxError.toExponential(2),
            success: true
        });
    } catch (e) {
        results.push({
            algorithm: 'LU Decomposition',
            error: e.message,
            success: false
        });
    }

    self.postMessage({ type: 'progress', percentage: 70 });

    // Adjugate (only for small matrices)
    if (n <= 6) {
        try {
            const adjStart = performance.now();
            const adjResult = adjugateInverse(A);
            const adjTime = performance.now() - adjStart;
            results.push({
                algorithm: 'Adjugate',
                time: adjTime.toFixed(2),
                error: adjResult.verification.maxError.toExponential(2),
                success: true
            });
        } catch (e) {
            results.push({
                algorithm: 'Adjugate',
                error: e.message,
                success: false
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Get inverse from first successful method
    let inverse = null;
    let verification = null;
    try {
        const gjResult = gaussJordanInverse(A);
        inverse = gjResult.inverse;
        verification = gjResult.verification;
    } catch (e) {
        // Matrix is singular
    }

    return {
        algorithm: 'Algorithm Comparison',
        original: A,
        inverse: inverse,
        matrixSize: n,
        determinant: calculateDeterminant(A),
        comparison: results,
        verification: verification,
        description: 'Performance and accuracy comparison of inverse algorithms'
    };
}

// ========== Helper Functions ==========

function luDecomposition(A) {
    const n = A.length;
    const L = [];
    const U = A.map(row => [...row]);
    const P = [];

    for (let i = 0; i < n; i++) {
        L[i] = new Array(n).fill(0);
        L[i][i] = 1;
        P[i] = i;
    }

    for (let k = 0; k < n - 1; k++) {
        // Partial pivoting
        let maxVal = Math.abs(U[k][k]);
        let maxRow = k;
        for (let i = k + 1; i < n; i++) {
            if (Math.abs(U[i][k]) > maxVal) {
                maxVal = Math.abs(U[i][k]);
                maxRow = i;
            }
        }

        if (maxRow !== k) {
            [U[k], U[maxRow]] = [U[maxRow], U[k]];
            [P[k], P[maxRow]] = [P[maxRow], P[k]];
            for (let j = 0; j < k; j++) {
                [L[k][j], L[maxRow][j]] = [L[maxRow][j], L[k][j]];
            }
        }

        if (Math.abs(U[k][k]) < 1e-14) {
            throw new Error('Matrix is singular');
        }

        for (let i = k + 1; i < n; i++) {
            L[i][k] = U[i][k] / U[k][k];
            for (let j = k; j < n; j++) {
                U[i][j] -= L[i][k] * U[k][j];
            }
        }
    }

    return { L, U, P };
}

function calculateDeterminant(A) {
    const n = A.length;
    if (n === 1) return A[0][0];
    if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];

    // LU-based determinant
    const U = A.map(row => [...row]);
    let det = 1;
    let swaps = 0;

    for (let k = 0; k < n - 1; k++) {
        let maxRow = k;
        for (let i = k + 1; i < n; i++) {
            if (Math.abs(U[i][k]) > Math.abs(U[maxRow][k])) {
                maxRow = i;
            }
        }

        if (maxRow !== k) {
            [U[k], U[maxRow]] = [U[maxRow], U[k]];
            swaps++;
        }

        if (Math.abs(U[k][k]) < 1e-14) return 0;

        for (let i = k + 1; i < n; i++) {
            const factor = U[i][k] / U[k][k];
            for (let j = k; j < n; j++) {
                U[i][j] -= factor * U[k][j];
            }
        }
    }

    for (let i = 0; i < n; i++) {
        det *= U[i][i];
    }

    return swaps % 2 === 0 ? det : -det;
}

function getMinor(A, row, col) {
    const minor = [];
    for (let i = 0; i < A.length; i++) {
        if (i === row) continue;
        const newRow = [];
        for (let j = 0; j < A[0].length; j++) {
            if (j === col) continue;
            newRow.push(A[i][j]);
        }
        minor.push(newRow);
    }
    return minor;
}

function verifyInverse(A, Ainv) {
    const n = A.length;
    const product = [];
    let maxError = 0;

    for (let i = 0; i < n; i++) {
        product[i] = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += A[i][k] * Ainv[k][j];
            }
            product[i][j] = sum;

            const expected = i === j ? 1 : 0;
            const error = Math.abs(sum - expected);
            maxError = Math.max(maxError, error);
        }
    }

    return {
        product: product,
        maxError: maxError,
        isValid: maxError < 1e-10
    };
}
