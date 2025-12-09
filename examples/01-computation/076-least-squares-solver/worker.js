/**
 * Web Worker: Least Squares Solver
 * Solve min||Ax - b||² for overdetermined systems
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'normalEquations':
                result = normalEquations(data.A, data.b);
                break;
            case 'qrMethod':
                result = qrMethod(data.A, data.b);
                break;
            case 'svdMethod':
                result = svdMethod(data.A, data.b);
                break;
            case 'gradientDescent':
                result = gradientDescent(data.A, data.b);
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
 * Normal Equations: A'Ax = A'b
 */
function normalEquations(A, b) {
    const m = A.length;
    const n = A[0].length;

    if (m < n) {
        throw new Error('System must be overdetermined (m >= n)');
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // Compute A' * A
    const AtA = [];
    for (let i = 0; i < n; i++) {
        AtA[i] = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < m; k++) {
                sum += A[k][i] * A[k][j];
            }
            AtA[i][j] = sum;
        }
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    // Compute A' * b
    const Atb = [];
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let k = 0; k < m; k++) {
            sum += A[k][i] * b[k];
        }
        Atb[i] = sum;
    }

    self.postMessage({ type: 'progress', percentage: 50 });

    // Solve A'Ax = A'b using Cholesky (A'A is SPD)
    const x = solveCholesky(AtA, Atb);

    self.postMessage({ type: 'progress', percentage: 100 });

    const residual = computeResidual(A, x, b);
    const residualNorm = vectorNorm(residual);

    return {
        algorithm: 'Normal Equations',
        description: 'Solve A\'Ax = A\'b using Cholesky decomposition',
        solution: x,
        rows: m,
        cols: n,
        residualNorm: residualNorm,
        rSquared: computeRSquared(b, residual),
        method: 'direct'
    };
}

/**
 * QR Method: Ax = b => QRx = b => Rx = Q'b
 */
function qrMethod(A, b) {
    const m = A.length;
    const n = A[0].length;

    if (m < n) {
        throw new Error('System must be overdetermined (m >= n)');
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // QR decomposition using Modified Gram-Schmidt
    const Q = [];
    const R = [];

    for (let i = 0; i < m; i++) {
        Q[i] = new Array(n).fill(0);
    }
    for (let i = 0; i < n; i++) {
        R[i] = new Array(n).fill(0);
    }

    const V = A.map(row => [...row]);

    for (let j = 0; j < n; j++) {
        let norm = 0;
        for (let i = 0; i < m; i++) {
            norm += V[i][j] * V[i][j];
        }
        norm = Math.sqrt(norm);

        R[j][j] = norm;

        if (norm > 1e-14) {
            for (let i = 0; i < m; i++) {
                Q[i][j] = V[i][j] / norm;
            }
        }

        for (let k = j + 1; k < n; k++) {
            let dot = 0;
            for (let i = 0; i < m; i++) {
                dot += Q[i][j] * V[i][k];
            }
            R[j][k] = dot;

            for (let i = 0; i < m; i++) {
                V[i][k] -= dot * Q[i][j];
            }
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((j / n) * 50)
        });
    }

    self.postMessage({ type: 'progress', percentage: 70 });

    // Compute Q' * b
    const Qtb = [];
    for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let i = 0; i < m; i++) {
            sum += Q[i][j] * b[i];
        }
        Qtb[j] = sum;
    }

    // Back substitution: Rx = Q'b
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = Qtb[i];
        for (let j = i + 1; j < n; j++) {
            x[i] -= R[i][j] * x[j];
        }
        if (Math.abs(R[i][i]) > 1e-14) {
            x[i] /= R[i][i];
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const residual = computeResidual(A, x, b);
    const residualNorm = vectorNorm(residual);

    return {
        algorithm: 'QR Method',
        description: 'QR factorization for stable least squares',
        solution: x,
        rows: m,
        cols: n,
        residualNorm: residualNorm,
        rSquared: computeRSquared(b, residual),
        method: 'direct'
    };
}

/**
 * SVD Method: x = V * Σ⁺ * U' * b
 */
function svdMethod(A, b) {
    const m = A.length;
    const n = A[0].length;

    if (m < n) {
        throw new Error('System must be overdetermined (m >= n)');
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // Simplified SVD via A'A eigendecomposition
    // Compute A' * A
    const AtA = [];
    for (let i = 0; i < n; i++) {
        AtA[i] = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < m; k++) {
                sum += A[k][i] * A[k][j];
            }
            AtA[i][j] = sum;
        }
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    // Power iteration to get singular values and V
    const { singularValues, V } = computeSVDComponents(AtA, n);

    self.postMessage({ type: 'progress', percentage: 60 });

    // Compute U columns: u_i = A * v_i / sigma_i
    const U = [];
    for (let i = 0; i < m; i++) {
        U[i] = new Array(n).fill(0);
    }

    for (let j = 0; j < n; j++) {
        if (singularValues[j] > 1e-10) {
            for (let i = 0; i < m; i++) {
                let sum = 0;
                for (let k = 0; k < n; k++) {
                    sum += A[i][k] * V[k][j];
                }
                U[i][j] = sum / singularValues[j];
            }
        }
    }

    self.postMessage({ type: 'progress', percentage: 80 });

    // x = V * Σ⁺ * U' * b
    // First: U' * b
    const Utb = [];
    for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let i = 0; i < m; i++) {
            sum += U[i][j] * b[i];
        }
        Utb[j] = sum;
    }

    // Then: Σ⁺ * (U' * b)
    const SigmaInvUtb = [];
    for (let j = 0; j < n; j++) {
        SigmaInvUtb[j] = singularValues[j] > 1e-10 ? Utb[j] / singularValues[j] : 0;
    }

    // Finally: V * (Σ⁺ * U' * b)
    const x = [];
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
            sum += V[i][j] * SigmaInvUtb[j];
        }
        x[i] = sum;
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const residual = computeResidual(A, x, b);
    const residualNorm = vectorNorm(residual);

    // Compute effective rank
    const tol = 1e-10 * singularValues[0];
    const effectiveRank = singularValues.filter(s => s > tol).length;

    return {
        algorithm: 'SVD Method',
        description: 'Most stable method using pseudoinverse',
        solution: x,
        rows: m,
        cols: n,
        singularValues: singularValues,
        effectiveRank: effectiveRank,
        residualNorm: residualNorm,
        rSquared: computeRSquared(b, residual),
        method: 'direct'
    };
}

/**
 * Gradient Descent
 */
function gradientDescent(A, b) {
    const m = A.length;
    const n = A[0].length;

    if (m < n) {
        throw new Error('System must be overdetermined (m >= n)');
    }

    const maxIter = 10000;
    const tol = 1e-10;

    // Compute step size: 1 / ||A||² (approximately)
    let maxNorm = 0;
    for (let i = 0; i < m; i++) {
        let rowNorm = 0;
        for (let j = 0; j < n; j++) {
            rowNorm += A[i][j] * A[i][j];
        }
        maxNorm = Math.max(maxNorm, rowNorm);
    }
    const alpha = 0.5 / (maxNorm * m);

    let x = new Array(n).fill(0);
    const convergenceHistory = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    let iter;
    for (iter = 0; iter < maxIter; iter++) {
        // Compute gradient: A' * (Ax - b)
        const Ax = [];
        for (let i = 0; i < m; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                sum += A[i][j] * x[j];
            }
            Ax[i] = sum - b[i];
        }

        const gradient = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let i = 0; i < m; i++) {
                sum += A[i][j] * Ax[i];
            }
            gradient[j] = sum;
        }

        // Update x
        let gradNorm = 0;
        for (let j = 0; j < n; j++) {
            x[j] -= alpha * gradient[j];
            gradNorm += gradient[j] * gradient[j];
        }
        gradNorm = Math.sqrt(gradNorm);

        convergenceHistory.push(gradNorm);

        if (gradNorm < tol) break;

        if (iter % 100 === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((iter / maxIter) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const residual = computeResidual(A, x, b);
    const residualNorm = vectorNorm(residual);

    return {
        algorithm: 'Gradient Descent',
        description: 'Iterative optimization of ||Ax - b||²',
        solution: x,
        rows: m,
        cols: n,
        iterations: iter + 1,
        converged: iter < maxIter - 1,
        residualNorm: residualNorm,
        rSquared: computeRSquared(b, residual),
        convergenceHistory: convergenceHistory.slice(-10),
        method: 'iterative'
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A, b) {
    const m = A.length;
    const n = A[0].length;
    const results = [];

    self.postMessage({ type: 'progress', percentage: 5 });

    // Normal Equations
    try {
        const start = performance.now();
        const res = normalEquations(A, b);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Normal Eq.',
            time: time.toFixed(2),
            residualNorm: res.residualNorm.toExponential(2),
            rSquared: res.rSquared.toFixed(4),
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Normal Eq.', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 25 });

    // QR Method
    try {
        const start = performance.now();
        const res = qrMethod(A, b);
        const time = performance.now() - start;
        results.push({
            algorithm: 'QR',
            time: time.toFixed(2),
            residualNorm: res.residualNorm.toExponential(2),
            rSquared: res.rSquared.toFixed(4),
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'QR', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 50 });

    // SVD Method
    try {
        const start = performance.now();
        const res = svdMethod(A, b);
        const time = performance.now() - start;
        results.push({
            algorithm: 'SVD',
            time: time.toFixed(2),
            residualNorm: res.residualNorm.toExponential(2),
            rSquared: res.rSquared.toFixed(4),
            rank: res.effectiveRank,
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'SVD', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 75 });

    // Gradient Descent
    try {
        const start = performance.now();
        const res = gradientDescent(A, b);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Grad. Desc.',
            time: time.toFixed(2),
            residualNorm: res.residualNorm.toExponential(2),
            rSquared: res.rSquared.toFixed(4),
            iterations: res.iterations,
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Grad. Desc.', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Get best result
    let bestResult = null;
    try {
        bestResult = qrMethod(A, b);
    } catch (e) {}

    return {
        algorithm: 'Algorithm Comparison',
        comparison: results,
        solution: bestResult?.solution,
        rows: m,
        cols: n,
        residualNorm: bestResult?.residualNorm,
        rSquared: bestResult?.rSquared,
        description: 'Comparison of least squares solvers'
    };
}

// ========== Helper Functions ==========

function solveCholesky(A, b) {
    const n = A.length;

    // Cholesky: A = L * L'
    const L = [];
    for (let i = 0; i < n; i++) {
        L[i] = new Array(n).fill(0);
    }

    for (let i = 0; i < n; i++) {
        for (let j = 0; j <= i; j++) {
            let sum = 0;
            if (j === i) {
                for (let k = 0; k < j; k++) {
                    sum += L[j][k] * L[j][k];
                }
                const val = A[j][j] - sum;
                if (val <= 0) {
                    throw new Error('Matrix is not positive definite');
                }
                L[j][j] = Math.sqrt(val);
            } else {
                for (let k = 0; k < j; k++) {
                    sum += L[i][k] * L[j][k];
                }
                L[i][j] = (A[i][j] - sum) / L[j][j];
            }
        }
    }

    // Forward: Ly = b
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        y[i] = b[i];
        for (let j = 0; j < i; j++) {
            y[i] -= L[i][j] * y[j];
        }
        y[i] /= L[i][i];
    }

    // Backward: L'x = y
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = y[i];
        for (let j = i + 1; j < n; j++) {
            x[i] -= L[j][i] * x[j];
        }
        x[i] /= L[i][i];
    }

    return x;
}

function computeSVDComponents(AtA, n) {
    const maxIter = 100;
    const tol = 1e-12;

    const singularValues = [];
    const V = [];
    for (let i = 0; i < n; i++) {
        V[i] = new Array(n).fill(0);
    }

    let B = AtA.map(row => [...row]);

    for (let k = 0; k < n; k++) {
        // Power iteration
        let v = [];
        for (let i = 0; i < n; i++) {
            v.push(Math.random() - 0.5);
        }

        for (let iter = 0; iter < maxIter; iter++) {
            // w = B * v
            const w = [];
            for (let i = 0; i < n; i++) {
                let sum = 0;
                for (let j = 0; j < n; j++) {
                    sum += B[i][j] * v[j];
                }
                w[i] = sum;
            }

            const norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0));
            if (norm < tol) break;

            const vNew = w.map(x => x / norm);

            let diff = 0;
            for (let i = 0; i < n; i++) {
                diff += Math.abs(Math.abs(vNew[i]) - Math.abs(v[i]));
            }

            v = vNew;
            if (diff < tol) break;
        }

        // Eigenvalue of AtA
        let lambda = 0;
        const Bv = [];
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
                sum += B[i][j] * v[j];
            }
            Bv[i] = sum;
        }
        for (let i = 0; i < n; i++) {
            lambda += v[i] * Bv[i];
        }

        singularValues.push(Math.sqrt(Math.max(0, lambda)));
        for (let i = 0; i < n; i++) {
            V[i][k] = v[i];
        }

        // Deflate
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                B[i][j] -= lambda * v[i] * v[j];
            }
        }
    }

    return { singularValues, V };
}

function computeResidual(A, x, b) {
    const m = A.length;
    const residual = [];
    for (let i = 0; i < m; i++) {
        let sum = 0;
        for (let j = 0; j < x.length; j++) {
            sum += A[i][j] * x[j];
        }
        residual.push(b[i] - sum);
    }
    return residual;
}

function vectorNorm(v) {
    return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

function computeRSquared(b, residual) {
    const m = b.length;
    const mean = b.reduce((s, x) => s + x, 0) / m;

    let ssTot = 0;
    let ssRes = 0;
    for (let i = 0; i < m; i++) {
        ssTot += (b[i] - mean) * (b[i] - mean);
        ssRes += residual[i] * residual[i];
    }

    return ssTot > 0 ? 1 - ssRes / ssTot : 0;
}
