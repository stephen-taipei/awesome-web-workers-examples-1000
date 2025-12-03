/**
 * Web Worker: Linear Equation Solver
 * Solve Ax = b using direct and iterative methods
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'gaussianElimination':
                result = gaussianElimination(data.A, data.b);
                break;
            case 'luSolve':
                result = luSolve(data.A, data.b);
                break;
            case 'jacobi':
                result = jacobiIteration(data.A, data.b);
                break;
            case 'gaussSeidel':
                result = gaussSeidelIteration(data.A, data.b);
                break;
            case 'compare':
                result = compareAlgorithms(data.A, data.b);
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
 * Gaussian Elimination with Partial Pivoting
 */
function gaussianElimination(A, b) {
    const n = A.length;

    // Create augmented matrix [A|b]
    const aug = [];
    for (let i = 0; i < n; i++) {
        aug[i] = [...A[i], b[i]];
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // Forward elimination with partial pivoting
    for (let k = 0; k < n - 1; k++) {
        // Find pivot
        let maxVal = Math.abs(aug[k][k]);
        let maxRow = k;
        for (let i = k + 1; i < n; i++) {
            if (Math.abs(aug[i][k]) > maxVal) {
                maxVal = Math.abs(aug[i][k]);
                maxRow = i;
            }
        }

        if (maxVal < 1e-14) {
            throw new Error('Matrix is singular or nearly singular');
        }

        // Swap rows
        if (maxRow !== k) {
            [aug[k], aug[maxRow]] = [aug[maxRow], aug[k]];
        }

        // Eliminate
        for (let i = k + 1; i < n; i++) {
            const factor = aug[i][k] / aug[k][k];
            for (let j = k; j <= n; j++) {
                aug[i][j] -= factor * aug[k][j];
            }
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((k / (n - 1)) * 50)
        });
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = aug[i][n];
        for (let j = i + 1; j < n; j++) {
            sum -= aug[i][j] * x[j];
        }
        if (Math.abs(aug[i][i]) < 1e-14) {
            throw new Error('Matrix is singular');
        }
        x[i] = sum / aug[i][i];

        self.postMessage({
            type: 'progress',
            percentage: 60 + Math.round(((n - 1 - i) / n) * 30)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const residual = computeResidual(A, x, b);

    return {
        algorithm: 'Gaussian Elimination',
        description: 'Direct method with partial pivoting',
        solution: x,
        systemSize: n,
        residual: residual,
        residualNorm: vectorNorm(residual),
        method: 'direct'
    };
}

/**
 * LU Decomposition Solver
 */
function luSolve(A, b) {
    const n = A.length;

    // LU decomposition with partial pivoting
    const LU = A.map(row => [...row]);
    const P = [];
    for (let i = 0; i < n; i++) P[i] = i;

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let k = 0; k < n - 1; k++) {
        // Partial pivoting
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

        if (maxRow !== k) {
            [LU[k], LU[maxRow]] = [LU[maxRow], LU[k]];
            [P[k], P[maxRow]] = [P[maxRow], P[k]];
        }

        for (let i = k + 1; i < n; i++) {
            LU[i][k] /= LU[k][k];
            for (let j = k + 1; j < n; j++) {
                LU[i][j] -= LU[i][k] * LU[k][j];
            }
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((k / (n - 1)) * 40)
        });
    }

    // Apply permutation to b
    const Pb = P.map(i => b[i]);

    // Forward substitution: Ly = Pb
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        y[i] = Pb[i];
        for (let j = 0; j < i; j++) {
            y[i] -= LU[i][j] * y[j];
        }
    }

    self.postMessage({ type: 'progress', percentage: 70 });

    // Back substitution: Ux = y
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = y[i];
        for (let j = i + 1; j < n; j++) {
            x[i] -= LU[i][j] * x[j];
        }
        x[i] /= LU[i][i];
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const residual = computeResidual(A, x, b);

    return {
        algorithm: 'LU Decomposition',
        description: 'PA = LU factorization then forward/back substitution',
        solution: x,
        systemSize: n,
        residual: residual,
        residualNorm: vectorNorm(residual),
        method: 'direct'
    };
}

/**
 * Jacobi Iteration
 */
function jacobiIteration(A, b) {
    const n = A.length;
    const maxIter = 1000;
    const tol = 1e-10;

    // Check diagonal dominance
    let isDiagonallyDominant = true;
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
            if (i !== j) sum += Math.abs(A[i][j]);
        }
        if (Math.abs(A[i][i]) <= sum) {
            isDiagonallyDominant = false;
            break;
        }
    }

    // Initial guess
    let x = new Array(n).fill(0);
    let xNew = new Array(n).fill(0);

    const convergenceHistory = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    let iter;
    for (iter = 0; iter < maxIter; iter++) {
        for (let i = 0; i < n; i++) {
            let sum = b[i];
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    sum -= A[i][j] * x[j];
                }
            }
            if (Math.abs(A[i][i]) < 1e-14) {
                throw new Error('Zero diagonal element');
            }
            xNew[i] = sum / A[i][i];
        }

        // Check convergence
        let diff = 0;
        for (let i = 0; i < n; i++) {
            diff += Math.abs(xNew[i] - x[i]);
        }
        convergenceHistory.push(diff);

        // Swap
        [x, xNew] = [xNew, x];

        if (diff < tol) break;

        if (iter % 10 === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((iter / maxIter) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const residual = computeResidual(A, x, b);

    return {
        algorithm: 'Jacobi Iteration',
        description: 'Iterative method using previous iteration values',
        solution: x,
        systemSize: n,
        iterations: iter + 1,
        converged: iter < maxIter - 1,
        isDiagonallyDominant: isDiagonallyDominant,
        residual: residual,
        residualNorm: vectorNorm(residual),
        convergenceHistory: convergenceHistory.slice(-10),
        method: 'iterative'
    };
}

/**
 * Gauss-Seidel Iteration
 */
function gaussSeidelIteration(A, b) {
    const n = A.length;
    const maxIter = 1000;
    const tol = 1e-10;

    // Check diagonal dominance
    let isDiagonallyDominant = true;
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
            if (i !== j) sum += Math.abs(A[i][j]);
        }
        if (Math.abs(A[i][i]) <= sum) {
            isDiagonallyDominant = false;
            break;
        }
    }

    // Initial guess
    let x = new Array(n).fill(0);
    let xOld = new Array(n).fill(0);

    const convergenceHistory = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    let iter;
    for (iter = 0; iter < maxIter; iter++) {
        // Save old values
        for (let i = 0; i < n; i++) xOld[i] = x[i];

        for (let i = 0; i < n; i++) {
            let sum = b[i];
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    sum -= A[i][j] * x[j]; // Uses updated values
                }
            }
            if (Math.abs(A[i][i]) < 1e-14) {
                throw new Error('Zero diagonal element');
            }
            x[i] = sum / A[i][i];
        }

        // Check convergence
        let diff = 0;
        for (let i = 0; i < n; i++) {
            diff += Math.abs(x[i] - xOld[i]);
        }
        convergenceHistory.push(diff);

        if (diff < tol) break;

        if (iter % 10 === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((iter / maxIter) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const residual = computeResidual(A, x, b);

    return {
        algorithm: 'Gauss-Seidel Iteration',
        description: 'Iterative method using immediately updated values',
        solution: x,
        systemSize: n,
        iterations: iter + 1,
        converged: iter < maxIter - 1,
        isDiagonallyDominant: isDiagonallyDominant,
        residual: residual,
        residualNorm: vectorNorm(residual),
        convergenceHistory: convergenceHistory.slice(-10),
        method: 'iterative'
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A, b) {
    const n = A.length;
    const results = [];

    self.postMessage({ type: 'progress', percentage: 5 });

    // Gaussian Elimination
    try {
        const start = performance.now();
        const res = gaussianElimination(A, b);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Gaussian',
            time: time.toFixed(2),
            residualNorm: res.residualNorm.toExponential(2),
            iterations: '-',
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Gaussian', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 25 });

    // LU Solve
    try {
        const start = performance.now();
        const res = luSolve(A, b);
        const time = performance.now() - start;
        results.push({
            algorithm: 'LU',
            time: time.toFixed(2),
            residualNorm: res.residualNorm.toExponential(2),
            iterations: '-',
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'LU', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 50 });

    // Jacobi
    try {
        const start = performance.now();
        const res = jacobiIteration(A, b);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Jacobi',
            time: time.toFixed(2),
            residualNorm: res.residualNorm.toExponential(2),
            iterations: res.iterations,
            converged: res.converged,
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Jacobi', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 75 });

    // Gauss-Seidel
    try {
        const start = performance.now();
        const res = gaussSeidelIteration(A, b);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Gauss-Seidel',
            time: time.toFixed(2),
            residualNorm: res.residualNorm.toExponential(2),
            iterations: res.iterations,
            converged: res.converged,
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Gauss-Seidel', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Get best result
    let bestResult = null;
    try {
        bestResult = gaussianElimination(A, b);
    } catch (e) {}

    return {
        algorithm: 'Algorithm Comparison',
        comparison: results,
        solution: bestResult?.solution,
        systemSize: n,
        residualNorm: bestResult?.residualNorm,
        description: 'Comparison of linear system solvers'
    };
}

// ========== Helper Functions ==========

function computeResidual(A, x, b) {
    const n = A.length;
    const residual = [];
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
            sum += A[i][j] * x[j];
        }
        residual.push(b[i] - sum);
    }
    return residual;
}

function vectorNorm(v) {
    return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}
