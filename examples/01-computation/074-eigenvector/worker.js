/**
 * Web Worker: Eigenvector Calculator
 * Power Iteration, Inverse Iteration, Rayleigh Quotient
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'powerIteration':
                result = powerIterationAll(data.matrix);
                break;
            case 'inverseIteration':
                result = inverseIteration(data.matrix, data.targetEigenvalue);
                break;
            case 'rayleighQuotient':
                result = rayleighQuotientIteration(data.matrix);
                break;
            case 'simultaneous':
                result = simultaneousIteration(data.matrix);
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
 * Power Iteration with deflation to find all eigenpairs
 */
function powerIterationAll(A) {
    const n = A.length;
    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    const maxIter = 500;
    const tol = 1e-10;

    const eigenvalues = [];
    const eigenvectors = [];

    // Work with a copy
    let B = A.map(row => [...row]);

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let k = 0; k < n; k++) {
        // Random initial vector
        let v = randomVector(n);

        let lambda = 0;
        let prevLambda = Infinity;

        for (let iter = 0; iter < maxIter; iter++) {
            // w = B * v
            const w = multiplyMatrixVector(B, v);

            // Rayleigh quotient
            lambda = dotProduct(v, w);

            // Normalize
            const norm = vectorNorm(w);
            if (norm < tol) break;

            v = w.map(x => x / norm);

            if (Math.abs(lambda - prevLambda) < tol) break;
            prevLambda = lambda;
        }

        eigenvalues.push(lambda);
        eigenvectors.push([...v]);

        // Deflation: B = B - lambda * v * v^T
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                B[i][j] -= lambda * v[i] * v[j];
            }
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((k / n) * 80)
        });
    }

    // Sort by eigenvalue magnitude
    const indices = eigenvalues.map((_, i) => i);
    indices.sort((a, b) => Math.abs(eigenvalues[b]) - Math.abs(eigenvalues[a]));

    const sortedEig = indices.map(i => eigenvalues[i]);
    const sortedVec = indices.map(i => eigenvectors[i]);

    self.postMessage({ type: 'progress', percentage: 100 });

    // Verify Av = λv
    const verification = verifyEigenpairs(A, sortedEig, sortedVec);

    return {
        algorithm: 'Power Iteration with Deflation',
        description: 'Sequential extraction of eigenpairs via deflation',
        eigenvalues: sortedEig,
        eigenvectors: sortedVec,
        matrixSize: n,
        verification: verification
    };
}

/**
 * Inverse Iteration for specific eigenvalue
 */
function inverseIteration(A, targetLambda) {
    const n = A.length;
    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    const maxIter = 100;
    const tol = 1e-12;

    // Create (A - targetLambda * I)
    const shifted = A.map((row, i) => row.map((val, j) => i === j ? val - targetLambda : val));

    // LU decomposition
    const { L, U, P } = luDecomposition(shifted);

    // Random initial vector
    let v = randomVector(n);

    let lambda = targetLambda;

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let iter = 0; iter < maxIter; iter++) {
        // Solve (A - mu*I) * w = v
        const Pv = applyPermutation(P, v);
        const y = forwardSubstitution(L, Pv);
        const w = backwardSubstitution(U, y);

        // Normalize
        const norm = vectorNorm(w);
        if (norm < tol) break;

        v = w.map(x => x / norm);

        // Update eigenvalue estimate using Rayleigh quotient
        const Av = multiplyMatrixVector(A, v);
        lambda = dotProduct(v, Av);

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((iter / maxIter) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Verify
    const Av = multiplyMatrixVector(A, v);
    const residual = vectorNorm(Av.map((val, i) => val - lambda * v[i]));

    return {
        algorithm: 'Inverse Iteration',
        description: `Eigenvector for λ ≈ ${targetLambda}`,
        eigenvalues: [lambda],
        eigenvectors: [v],
        targetEigenvalue: targetLambda,
        foundEigenvalue: lambda,
        matrixSize: n,
        residual: residual,
        converged: residual < 1e-8
    };
}

/**
 * Rayleigh Quotient Iteration - cubic convergence
 */
function rayleighQuotientIteration(A) {
    const n = A.length;
    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    const maxIter = 50;
    const tol = 1e-14;

    // Random initial vector
    let v = randomVector(n);

    // Initial Rayleigh quotient
    let Av = multiplyMatrixVector(A, v);
    let lambda = dotProduct(v, Av);

    const convergenceHistory = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let iter = 0; iter < maxIter; iter++) {
        // Create (A - lambda * I)
        const shifted = A.map((row, i) => row.map((val, j) => i === j ? val - lambda : val));

        // LU decomposition
        try {
            const { L, U, P } = luDecomposition(shifted);

            // Solve (A - lambda*I) * w = v
            const Pv = applyPermutation(P, v);
            const y = forwardSubstitution(L, Pv);
            const w = backwardSubstitution(U, y);

            // Normalize
            const norm = vectorNorm(w);
            if (norm < tol) break;

            v = w.map(x => x / norm);
        } catch (e) {
            // Singular matrix means we found an eigenvalue
            break;
        }

        // Update Rayleigh quotient
        Av = multiplyMatrixVector(A, v);
        const newLambda = dotProduct(v, Av);

        convergenceHistory.push(Math.abs(newLambda - lambda));

        if (Math.abs(newLambda - lambda) < tol) {
            lambda = newLambda;
            break;
        }

        lambda = newLambda;

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((iter / maxIter) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Verify
    Av = multiplyMatrixVector(A, v);
    const residual = vectorNorm(Av.map((val, i) => val - lambda * v[i]));

    return {
        algorithm: 'Rayleigh Quotient Iteration',
        description: 'Cubic convergence to nearest eigenpair',
        eigenvalues: [lambda],
        eigenvectors: [v],
        matrixSize: n,
        iterations: convergenceHistory.length,
        residual: residual,
        convergenceHistory: convergenceHistory.slice(-5)
    };
}

/**
 * Simultaneous Iteration (Block Power Method)
 */
function simultaneousIteration(A) {
    const n = A.length;
    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    const maxIter = 200;
    const tol = 1e-10;

    // Initialize Q as random orthonormal matrix
    let Q = [];
    for (let i = 0; i < n; i++) {
        Q[i] = randomVector(n);
    }

    // Orthogonalize initial Q
    Q = gramSchmidt(Q);

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let iter = 0; iter < maxIter; iter++) {
        // Z = A * Q
        const Z = multiplyMatrices(A, transposeMatrix(Q));

        // QR decomposition of Z
        const { Q: Qnew, R } = qrDecomposition(Z);

        // Check convergence (compare R diagonals)
        let converged = true;
        for (let i = 0; i < n - 1; i++) {
            if (Math.abs(R[i + 1][i]) > tol) {
                converged = false;
                break;
            }
        }

        Q = transposeMatrix(Qnew);

        if (converged) break;

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((iter / maxIter) * 80)
        });
    }

    // Extract eigenvalues and eigenvectors
    const eigenvalues = [];
    const eigenvectors = [];

    for (let i = 0; i < n; i++) {
        const v = Q[i];
        const Av = multiplyMatrixVector(A, v);
        const lambda = dotProduct(v, Av);
        eigenvalues.push(lambda);
        eigenvectors.push(v);
    }

    // Sort by eigenvalue magnitude
    const indices = eigenvalues.map((_, i) => i);
    indices.sort((a, b) => Math.abs(eigenvalues[b]) - Math.abs(eigenvalues[a]));

    const sortedEig = indices.map(i => eigenvalues[i]);
    const sortedVec = indices.map(i => eigenvectors[i]);

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifyEigenpairs(A, sortedEig, sortedVec);

    return {
        algorithm: 'Simultaneous Iteration',
        description: 'Block power method for multiple eigenvectors',
        eigenvalues: sortedEig,
        eigenvectors: sortedVec,
        matrixSize: n,
        verification: verification
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A) {
    const n = A.length;
    const results = [];

    self.postMessage({ type: 'progress', percentage: 5 });

    // Power Iteration
    try {
        const start = performance.now();
        const res = powerIterationAll(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Power + Deflation',
            time: time.toFixed(2),
            maxError: res.verification.maxError.toExponential(2),
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Power + Deflation', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    // Rayleigh Quotient
    try {
        const start = performance.now();
        const res = rayleighQuotientIteration(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Rayleigh Quotient',
            time: time.toFixed(2),
            eigenvalue: res.eigenvalues[0]?.toFixed(4) || '-',
            iterations: res.iterations,
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Rayleigh Quotient', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 60 });

    // Simultaneous Iteration
    try {
        const start = performance.now();
        const res = simultaneousIteration(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Simultaneous',
            time: time.toFixed(2),
            maxError: res.verification.maxError.toExponential(2),
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Simultaneous', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Get best result
    let bestResult = null;
    try {
        bestResult = simultaneousIteration(A);
    } catch (e) {}

    return {
        algorithm: 'Algorithm Comparison',
        comparison: results,
        eigenvalues: bestResult?.eigenvalues,
        eigenvectors: bestResult?.eigenvectors,
        matrixSize: n,
        description: 'Comparison of eigenvector algorithms'
    };
}

// ========== Helper Functions ==========

function randomVector(n) {
    const v = [];
    for (let i = 0; i < n; i++) {
        v.push(Math.random() - 0.5);
    }
    return normalize(v);
}

function normalize(v) {
    const norm = vectorNorm(v);
    if (norm < 1e-14) return v;
    return v.map(x => x / norm);
}

function vectorNorm(v) {
    return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

function dotProduct(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

function multiplyMatrixVector(A, v) {
    const m = A.length;
    const result = [];
    for (let i = 0; i < m; i++) {
        let sum = 0;
        for (let j = 0; j < v.length; j++) {
            sum += A[i][j] * v[j];
        }
        result.push(sum);
    }
    return result;
}

function multiplyMatrices(A, B) {
    const m = A.length;
    const n = B[0].length;
    const p = B.length;
    const C = [];

    for (let i = 0; i < m; i++) {
        C[i] = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < p; k++) {
                sum += A[i][k] * B[k][j];
            }
            C[i][j] = sum;
        }
    }

    return C;
}

function transposeMatrix(A) {
    const m = A.length;
    const n = A[0].length;
    const T = [];
    for (let j = 0; j < n; j++) {
        T[j] = [];
        for (let i = 0; i < m; i++) {
            T[j][i] = A[i][j];
        }
    }
    return T;
}

function gramSchmidt(vectors) {
    const n = vectors.length;
    const result = [];

    for (let i = 0; i < n; i++) {
        let v = [...vectors[i]];

        // Subtract projections onto previous vectors
        for (let j = 0; j < i; j++) {
            const dot = dotProduct(v, result[j]);
            v = v.map((val, k) => val - dot * result[j][k]);
        }

        // Normalize
        result.push(normalize(v));
    }

    return result;
}

function qrDecomposition(A) {
    const m = A.length;
    const n = A[0].length;

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
    }

    return { Q, R };
}

function luDecomposition(A) {
    const n = A.length;
    const LU = A.map(row => [...row]);
    const P = [];
    for (let i = 0; i < n; i++) P[i] = i;

    for (let k = 0; k < n - 1; k++) {
        let maxVal = Math.abs(LU[k][k]);
        let maxRow = k;
        for (let i = k + 1; i < n; i++) {
            if (Math.abs(LU[i][k]) > maxVal) {
                maxVal = Math.abs(LU[i][k]);
                maxRow = i;
            }
        }

        if (maxVal < 1e-14) {
            throw new Error('Singular matrix');
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
    }

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

    return { L, U, P };
}

function applyPermutation(P, v) {
    return P.map(i => v[i]);
}

function forwardSubstitution(L, b) {
    const n = L.length;
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        y[i] = b[i];
        for (let j = 0; j < i; j++) {
            y[i] -= L[i][j] * y[j];
        }
    }
    return y;
}

function backwardSubstitution(U, y) {
    const n = U.length;
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = y[i];
        for (let j = i + 1; j < n; j++) {
            x[i] -= U[i][j] * x[j];
        }
        if (Math.abs(U[i][i]) > 1e-14) {
            x[i] /= U[i][i];
        }
    }
    return x;
}

function verifyEigenpairs(A, eigenvalues, eigenvectors) {
    let maxError = 0;

    for (let k = 0; k < eigenvalues.length; k++) {
        const lambda = eigenvalues[k];
        const v = eigenvectors[k];
        const Av = multiplyMatrixVector(A, v);

        // ||Av - λv||
        const residual = Av.map((val, i) => val - lambda * v[i]);
        const error = vectorNorm(residual);
        maxError = Math.max(maxError, error);
    }

    return {
        maxError: maxError,
        isValid: maxError < 1e-6
    };
}
