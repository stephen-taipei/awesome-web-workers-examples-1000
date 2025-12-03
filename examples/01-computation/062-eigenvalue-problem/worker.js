/**
 * Web Worker: Eigenvalue Problem Solver
 * Various methods for computing eigenvalues and eigenvectors
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'powerMethod':
                result = powerMethod(data.matrix, data.tolerance, data.maxIterations);
                break;
            case 'inversePower':
                result = inversePowerMethod(data.matrix, data.shift, data.tolerance, data.maxIterations);
                break;
            case 'qrAlgorithm':
                result = qrAlgorithm(data.matrix, data.tolerance, data.maxIterations);
                break;
            case 'jacobi':
                result = jacobiMethod(data.matrix, data.tolerance, data.maxIterations);
                break;
            case 'rayleighQuotient':
                result = rayleighQuotientIteration(data.matrix, data.initialVector, data.tolerance, data.maxIterations);
                break;
            case 'compare':
                result = compareAllMethods(data.matrix, data.tolerance);
                break;
            default:
                throw new Error('Unknown method type');
        }

        const executionTime = (performance.now() - startTime).toFixed(2);
        self.postMessage({ type: 'result', calculationType: type, result, executionTime });
    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};

/**
 * Power Method - finds dominant eigenvalue
 */
function powerMethod(A, tolerance = 1e-10, maxIterations = 1000) {
    const n = A.length;

    // Initial vector
    let x = new Array(n).fill(1);
    let lambda = 0;
    let lambdaPrev = 0;
    let iterations = 0;
    const convergenceHistory = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let iter = 0; iter < maxIterations; iter++) {
        // y = A * x
        const y = matrixVectorMultiply(A, x);

        // Find maximum component (for normalization)
        lambdaPrev = lambda;
        lambda = 0;
        let maxIdx = 0;
        for (let i = 0; i < n; i++) {
            if (Math.abs(y[i]) > Math.abs(lambda)) {
                lambda = y[i];
                maxIdx = i;
            }
        }

        // Normalize
        for (let i = 0; i < n; i++) {
            x[i] = y[i] / lambda;
        }

        iterations = iter + 1;
        const error = Math.abs(lambda - lambdaPrev);
        convergenceHistory.push({ iteration: iter + 1, eigenvalue: lambda, error: error });

        if (error < tolerance) {
            break;
        }

        if (iter % Math.floor(maxIterations / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((iter / maxIterations) * 80)
            });
        }
    }

    // Normalize eigenvector
    const norm = Math.sqrt(x.reduce((sum, xi) => sum + xi * xi, 0));
    x = x.map(xi => xi / norm);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Power Method',
        description: 'Finds dominant (largest magnitude) eigenvalue',
        eigenvalue: lambda,
        eigenvector: x,
        iterations: iterations,
        converged: iterations < maxIterations,
        convergenceHistory: convergenceHistory.slice(-20),
        matrixSize: n
    };
}

/**
 * Inverse Power Method - finds smallest eigenvalue (or closest to shift)
 */
function inversePowerMethod(A, shift = 0, tolerance = 1e-10, maxIterations = 1000) {
    const n = A.length;

    // Create shifted matrix: (A - σI)
    const B = A.map((row, i) => row.map((val, j) => i === j ? val - shift : val));

    // LU decomposition for solving linear systems
    const { L, U, P } = luDecomposition(B);

    // Initial vector
    let x = new Array(n).fill(1);
    let lambda = 0;
    let lambdaPrev = 0;
    let iterations = 0;

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let iter = 0; iter < maxIterations; iter++) {
        // Solve (A - σI) * y = x using LU
        const y = solveLU(L, U, P, x);

        // Find maximum component
        lambdaPrev = lambda;
        lambda = 0;
        for (let i = 0; i < n; i++) {
            if (Math.abs(y[i]) > Math.abs(lambda)) {
                lambda = y[i];
            }
        }

        // Normalize
        for (let i = 0; i < n; i++) {
            x[i] = y[i] / lambda;
        }

        iterations = iter + 1;

        if (Math.abs(lambda - lambdaPrev) < tolerance * Math.abs(lambda)) {
            break;
        }

        if (iter % Math.floor(maxIterations / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((iter / maxIterations) * 80)
            });
        }
    }

    // Convert back to eigenvalue of original matrix
    const actualEigenvalue = shift + 1 / lambda;

    // Normalize eigenvector
    const norm = Math.sqrt(x.reduce((sum, xi) => sum + xi * xi, 0));
    x = x.map(xi => xi / norm);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Inverse Power Method',
        description: `Finds eigenvalue closest to shift σ = ${shift}`,
        eigenvalue: actualEigenvalue,
        eigenvector: x,
        shift: shift,
        iterations: iterations,
        converged: iterations < maxIterations,
        matrixSize: n
    };
}

/**
 * QR Algorithm - finds all eigenvalues
 */
function qrAlgorithm(A, tolerance = 1e-10, maxIterations = 500) {
    const n = A.length;
    let Ak = A.map(row => [...row]); // Copy
    let iterations = 0;
    const eigenvalueHistory = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let iter = 0; iter < maxIterations; iter++) {
        // QR decomposition
        const { Q, R } = qrDecomposition(Ak);

        // A(k+1) = R * Q
        Ak = matrixMultiply(R, Q);

        iterations = iter + 1;

        // Check convergence (sub-diagonal elements should be small)
        let maxOffDiag = 0;
        for (let i = 1; i < n; i++) {
            maxOffDiag = Math.max(maxOffDiag, Math.abs(Ak[i][i-1]));
        }

        if (iter % 10 === 0) {
            eigenvalueHistory.push({
                iteration: iter,
                diagonal: Ak.map((row, i) => row[i])
            });
        }

        if (maxOffDiag < tolerance) {
            break;
        }

        if (iter % Math.floor(maxIterations / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((iter / maxIterations) * 80)
            });
        }
    }

    // Extract eigenvalues from diagonal
    const eigenvalues = [];
    for (let i = 0; i < n; i++) {
        eigenvalues.push(Ak[i][i]);
    }

    // Sort by magnitude (descending)
    eigenvalues.sort((a, b) => Math.abs(b) - Math.abs(a));

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'QR Algorithm',
        description: 'Finds all eigenvalues through QR iteration',
        eigenvalues: eigenvalues,
        schurForm: Ak,
        iterations: iterations,
        converged: iterations < maxIterations,
        matrixSize: n
    };
}

/**
 * Jacobi Method - for symmetric matrices
 */
function jacobiMethod(A, tolerance = 1e-10, maxIterations = 1000) {
    const n = A.length;

    // Check symmetry
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(A[i][j] - A[j][i]) > 1e-10) {
                throw new Error('Jacobi method requires symmetric matrix');
            }
        }
    }

    let S = A.map(row => [...row]); // Working matrix
    let V = createIdentity(n); // Eigenvector matrix
    let iterations = 0;

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let iter = 0; iter < maxIterations; iter++) {
        // Find largest off-diagonal element
        let maxVal = 0;
        let p = 0, q = 0;
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (Math.abs(S[i][j]) > maxVal) {
                    maxVal = Math.abs(S[i][j]);
                    p = i;
                    q = j;
                }
            }
        }

        iterations = iter + 1;

        if (maxVal < tolerance) {
            break;
        }

        // Compute rotation angle
        const theta = (S[q][q] - S[p][p]) / (2 * S[p][q]);
        const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;

        // Apply Jacobi rotation
        const temp = S[p][p];
        S[p][p] = c * c * temp - 2 * s * c * S[p][q] + s * s * S[q][q];
        S[q][q] = s * s * temp + 2 * s * c * S[p][q] + c * c * S[q][q];
        S[p][q] = 0;
        S[q][p] = 0;

        for (let i = 0; i < n; i++) {
            if (i !== p && i !== q) {
                const sip = S[i][p];
                const siq = S[i][q];
                S[i][p] = S[p][i] = c * sip - s * siq;
                S[i][q] = S[q][i] = s * sip + c * siq;
            }

            // Update eigenvector matrix
            const vip = V[i][p];
            const viq = V[i][q];
            V[i][p] = c * vip - s * viq;
            V[i][q] = s * vip + c * viq;
        }

        if (iter % Math.floor(maxIterations / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((iter / maxIterations) * 80)
            });
        }
    }

    // Extract eigenvalues and sort
    const eigenvalues = [];
    for (let i = 0; i < n; i++) {
        eigenvalues.push(S[i][i]);
    }

    // Sort eigenvalues and rearrange eigenvectors
    const indices = eigenvalues.map((val, idx) => idx);
    indices.sort((a, b) => Math.abs(eigenvalues[b]) - Math.abs(eigenvalues[a]));

    const sortedEigenvalues = indices.map(i => eigenvalues[i]);
    const sortedEigenvectors = [];
    for (let j = 0; j < n; j++) {
        const vec = [];
        for (let i = 0; i < n; i++) {
            vec.push(V[i][indices[j]]);
        }
        sortedEigenvectors.push(vec);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Jacobi Method',
        description: 'Finds all eigenvalues/vectors for symmetric matrices',
        eigenvalues: sortedEigenvalues,
        eigenvectors: sortedEigenvectors,
        iterations: iterations,
        converged: iterations < maxIterations,
        matrixSize: n
    };
}

/**
 * Rayleigh Quotient Iteration - fast convergence to nearest eigenvalue
 */
function rayleighQuotientIteration(A, initialVector, tolerance = 1e-12, maxIterations = 100) {
    const n = A.length;

    // Initialize
    let x = initialVector ? [...initialVector] : new Array(n).fill(1);
    let norm = Math.sqrt(x.reduce((sum, xi) => sum + xi * xi, 0));
    x = x.map(xi => xi / norm);

    // Initial Rayleigh quotient
    let lambda = rayleighQuotient(A, x);
    let iterations = 0;
    const convergenceHistory = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let iter = 0; iter < maxIterations; iter++) {
        const lambdaPrev = lambda;

        // Form (A - λI)
        const B = A.map((row, i) => row.map((val, j) => i === j ? val - lambda : val));

        // Solve (A - λI) * y = x
        try {
            const { L, U, P } = luDecomposition(B);
            const y = solveLU(L, U, P, x);

            // Normalize
            norm = Math.sqrt(y.reduce((sum, yi) => sum + yi * yi, 0));
            x = y.map(yi => yi / norm);

            // Update Rayleigh quotient
            lambda = rayleighQuotient(A, x);
        } catch (e) {
            // Matrix may be singular when lambda is exact eigenvalue
            break;
        }

        iterations = iter + 1;
        const error = Math.abs(lambda - lambdaPrev);
        convergenceHistory.push({ iteration: iter + 1, eigenvalue: lambda, error: error });

        if (error < tolerance) {
            break;
        }

        if (iter % Math.floor(maxIterations / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((iter / maxIterations) * 80)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Rayleigh Quotient Iteration',
        description: 'Cubic convergence to nearest eigenvalue',
        eigenvalue: lambda,
        eigenvector: x,
        iterations: iterations,
        converged: iterations < maxIterations,
        convergenceHistory: convergenceHistory,
        matrixSize: n
    };
}

/**
 * Compare all methods on symmetric matrix
 */
function compareAllMethods(A, tolerance = 1e-10) {
    self.postMessage({ type: 'progress', percentage: 10 });

    const power = powerMethod(A, tolerance);
    self.postMessage({ type: 'progress', percentage: 30 });

    const inverse = inversePowerMethod(A, 0, tolerance);
    self.postMessage({ type: 'progress', percentage: 50 });

    const qr = qrAlgorithm(A, tolerance);
    self.postMessage({ type: 'progress', percentage: 70 });

    let jacobi = null;
    try {
        jacobi = jacobiMethod(A, tolerance);
    } catch (e) {
        // Not symmetric
    }
    self.postMessage({ type: 'progress', percentage: 90 });

    const rayleigh = rayleighQuotientIteration(A, null, tolerance);
    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Method Comparison',
        results: {
            power: { method: 'Power', eigenvalue: power.eigenvalue, iterations: power.iterations },
            inverse: { method: 'Inverse Power', eigenvalue: inverse.eigenvalue, iterations: inverse.iterations },
            qr: { method: 'QR Algorithm', eigenvalues: qr.eigenvalues, iterations: qr.iterations },
            jacobi: jacobi ? { method: 'Jacobi', eigenvalues: jacobi.eigenvalues, iterations: jacobi.iterations } : null,
            rayleigh: { method: 'Rayleigh', eigenvalue: rayleigh.eigenvalue, iterations: rayleigh.iterations }
        },
        matrixSize: A.length
    };
}

// ========== Helper Functions ==========

function matrixVectorMultiply(A, x) {
    const n = A.length;
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            y[i] += A[i][j] * x[j];
        }
    }
    return y;
}

function matrixMultiply(A, B) {
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

function createIdentity(n) {
    const I = [];
    for (let i = 0; i < n; i++) {
        I[i] = new Array(n).fill(0);
        I[i][i] = 1;
    }
    return I;
}

function rayleighQuotient(A, x) {
    const Ax = matrixVectorMultiply(A, x);
    let numerator = 0, denominator = 0;
    for (let i = 0; i < x.length; i++) {
        numerator += x[i] * Ax[i];
        denominator += x[i] * x[i];
    }
    return numerator / denominator;
}

function qrDecomposition(A) {
    const n = A.length;
    const Q = createIdentity(n);
    const R = A.map(row => [...row]);

    for (let k = 0; k < n - 1; k++) {
        // Compute Householder vector
        let sigma = 0;
        for (let i = k; i < n; i++) {
            sigma += R[i][k] * R[i][k];
        }
        sigma = Math.sqrt(sigma);

        if (R[k][k] < 0) sigma = -sigma;

        const u = new Array(n).fill(0);
        u[k] = R[k][k] + sigma;
        for (let i = k + 1; i < n; i++) {
            u[i] = R[i][k];
        }

        const beta = 2 / u.reduce((sum, ui) => sum + ui * ui, 0);

        // Apply Householder: R = (I - beta*u*u^T) * R
        for (let j = k; j < n; j++) {
            let dot = 0;
            for (let i = k; i < n; i++) {
                dot += u[i] * R[i][j];
            }
            for (let i = k; i < n; i++) {
                R[i][j] -= beta * u[i] * dot;
            }
        }

        // Update Q
        for (let j = 0; j < n; j++) {
            let dot = 0;
            for (let i = k; i < n; i++) {
                dot += u[i] * Q[i][j];
            }
            for (let i = k; i < n; i++) {
                Q[i][j] -= beta * u[i] * dot;
            }
        }
    }

    // Transpose Q
    const Qt = createIdentity(n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            Qt[i][j] = Q[j][i];
        }
    }

    return { Q: Qt, R };
}

function luDecomposition(A) {
    const n = A.length;
    const L = createIdentity(n);
    const U = A.map(row => [...row]);
    const P = [];
    for (let i = 0; i < n; i++) P[i] = i;

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
            throw new Error('Matrix is singular or nearly singular');
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

function solveLU(L, U, P, b) {
    const n = L.length;

    // Apply permutation
    const pb = new Array(n);
    for (let i = 0; i < n; i++) {
        pb[i] = b[P[i]];
    }

    // Forward substitution: L * y = pb
    const y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        y[i] = pb[i];
        for (let j = 0; j < i; j++) {
            y[i] -= L[i][j] * y[j];
        }
    }

    // Back substitution: U * x = y
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = y[i];
        for (let j = i + 1; j < n; j++) {
            x[i] -= U[i][j] * x[j];
        }
        x[i] /= U[i][i];
    }

    return x;
}
