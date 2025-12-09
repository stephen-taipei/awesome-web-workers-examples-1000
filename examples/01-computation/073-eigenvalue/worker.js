/**
 * Web Worker: Eigenvalue Calculator
 * QR Iteration, Power Method, Inverse Iteration
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'qrIteration':
                result = qrIteration(data.matrix);
                break;
            case 'powerMethod':
                result = powerMethod(data.matrix);
                break;
            case 'inverseIteration':
                result = inverseIteration(data.matrix);
                break;
            case 'shiftedQR':
                result = shiftedQR(data.matrix);
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
 * Basic QR Iteration
 */
function qrIteration(A) {
    const n = A.length;
    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    let T = A.map(row => [...row]);
    const maxIter = 1000;
    const tol = 1e-10;

    self.postMessage({ type: 'progress', percentage: 10 });

    // First, reduce to upper Hessenberg form
    T = hessenberg(T);

    self.postMessage({ type: 'progress', percentage: 20 });

    // QR iterations
    for (let iter = 0; iter < maxIter; iter++) {
        // Check convergence (subdiagonal elements)
        let maxSub = 0;
        for (let i = 1; i < n; i++) {
            maxSub = Math.max(maxSub, Math.abs(T[i][i - 1]));
        }
        if (maxSub < tol) break;

        // QR decomposition
        const { Q, R } = qrDecomposition(T);

        // T = R * Q
        T = multiplyMatrices(R, Q);

        self.postMessage({
            type: 'progress',
            percentage: 20 + Math.round((iter / maxIter) * 70)
        });
    }

    // Extract eigenvalues from diagonal
    const eigenvalues = extractEigenvalues(T);

    self.postMessage({ type: 'progress', percentage: 100 });

    // Verify: sum should equal trace, product should equal determinant
    const trace = computeTrace(A);
    const sumEig = eigenvalues.reduce((sum, e) => sum + e.real, 0);

    return {
        algorithm: 'QR Iteration',
        description: 'Iterative QR decomposition to find all eigenvalues',
        eigenvalues: eigenvalues,
        matrixSize: n,
        trace: trace,
        sumEigenvalues: sumEig,
        verification: {
            traceMatch: Math.abs(trace - sumEig) < 1e-6,
            traceError: Math.abs(trace - sumEig)
        }
    };
}

/**
 * Power Method - finds dominant eigenvalue
 */
function powerMethod(A) {
    const n = A.length;
    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    const maxIter = 1000;
    const tol = 1e-12;

    // Initial random vector
    let v = [];
    for (let i = 0; i < n; i++) {
        v.push(Math.random() - 0.5);
    }
    v = normalize(v);

    let lambda = 0;
    let prevLambda = 0;
    const convergenceHistory = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let iter = 0; iter < maxIter; iter++) {
        // w = A * v
        const w = multiplyMatrixVector(A, v);

        // Rayleigh quotient: lambda = v^T * A * v
        lambda = dotProduct(v, w);

        // Normalize
        v = normalize(w);

        convergenceHistory.push(Math.abs(lambda - prevLambda));

        if (Math.abs(lambda - prevLambda) < tol) {
            break;
        }

        prevLambda = lambda;

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((iter / maxIter) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        algorithm: 'Power Method',
        description: 'Finds the dominant (largest magnitude) eigenvalue',
        eigenvalues: [{ real: lambda, imag: 0 }],
        dominantEigenvalue: lambda,
        eigenvector: v,
        matrixSize: n,
        iterations: convergenceHistory.length,
        converged: convergenceHistory[convergenceHistory.length - 1] < tol
    };
}

/**
 * Inverse Iteration - finds smallest eigenvalue
 */
function inverseIteration(A) {
    const n = A.length;
    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    const maxIter = 1000;
    const tol = 1e-12;

    // LU decomposition of A
    const { L, U, P } = luDecomposition(A);

    // Initial random vector
    let v = [];
    for (let i = 0; i < n; i++) {
        v.push(Math.random() - 0.5);
    }
    v = normalize(v);

    let lambda = 0;
    let prevLambda = Infinity;

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let iter = 0; iter < maxIter; iter++) {
        // Solve A * w = v using LU
        const Pv = applyPermutation(P, v);
        const y = forwardSubstitution(L, Pv);
        const w = backwardSubstitution(U, y);

        // Rayleigh quotient on inverse: 1/lambda = v^T * w / (v^T * v)
        const vTw = dotProduct(v, w);
        lambda = 1 / vTw;

        // Normalize
        v = normalize(w);

        if (Math.abs(lambda - prevLambda) < tol) {
            break;
        }

        prevLambda = lambda;

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((iter / maxIter) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        algorithm: 'Inverse Iteration',
        description: 'Finds the smallest magnitude eigenvalue',
        eigenvalues: [{ real: lambda, imag: 0 }],
        smallestEigenvalue: lambda,
        eigenvector: v,
        matrixSize: n,
        converged: Math.abs(lambda - prevLambda) < tol
    };
}

/**
 * Shifted QR with Wilkinson shift
 */
function shiftedQR(A) {
    const n = A.length;
    if (n !== A[0].length) {
        throw new Error('Matrix must be square');
    }

    let T = A.map(row => [...row]);
    const maxIter = 30 * n;
    const tol = 1e-12;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Reduce to Hessenberg form
    T = hessenberg(T);

    self.postMessage({ type: 'progress', percentage: 20 });

    let m = n;

    for (let iter = 0; iter < maxIter && m > 1; iter++) {
        // Check for deflation
        while (m > 1 && Math.abs(T[m - 1][m - 2]) < tol * (Math.abs(T[m - 2][m - 2]) + Math.abs(T[m - 1][m - 1]))) {
            T[m - 1][m - 2] = 0;
            m--;
        }

        if (m <= 1) break;

        // Wilkinson shift
        const d = (T[m - 2][m - 2] - T[m - 1][m - 1]) / 2;
        const sign = d >= 0 ? 1 : -1;
        const mu = T[m - 1][m - 1] - sign * T[m - 1][m - 2] * T[m - 1][m - 2] /
            (Math.abs(d) + Math.sqrt(d * d + T[m - 1][m - 2] * T[m - 1][m - 2]));

        // Shift
        for (let i = 0; i < m; i++) {
            T[i][i] -= mu;
        }

        // QR step on reduced matrix
        const Tm = T.slice(0, m).map(row => row.slice(0, m));
        const { Q, R } = qrDecomposition(Tm);
        const newTm = multiplyMatrices(R, Q);

        // Unshift
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < m; j++) {
                T[i][j] = newTm[i][j];
            }
            T[i][i] += mu;
        }

        self.postMessage({
            type: 'progress',
            percentage: 20 + Math.round((iter / maxIter) * 70)
        });
    }

    // Extract eigenvalues
    const eigenvalues = extractEigenvalues(T);

    self.postMessage({ type: 'progress', percentage: 100 });

    const trace = computeTrace(A);
    const sumEig = eigenvalues.reduce((sum, e) => sum + e.real, 0);

    return {
        algorithm: 'Shifted QR (Wilkinson)',
        description: 'QR iteration with Wilkinson shift for faster convergence',
        eigenvalues: eigenvalues,
        matrixSize: n,
        trace: trace,
        sumEigenvalues: sumEig,
        verification: {
            traceMatch: Math.abs(trace - sumEig) < 1e-6,
            traceError: Math.abs(trace - sumEig)
        }
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A) {
    const n = A.length;
    const results = [];

    self.postMessage({ type: 'progress', percentage: 5 });

    // QR Iteration
    try {
        const start = performance.now();
        const res = qrIteration(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'QR Iteration',
            time: time.toFixed(2),
            count: res.eigenvalues.length,
            traceError: res.verification.traceError.toExponential(2),
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'QR Iteration', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    // Power Method
    try {
        const start = performance.now();
        const res = powerMethod(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Power Method',
            time: time.toFixed(2),
            dominant: res.dominantEigenvalue?.toFixed(6) || '-',
            iterations: res.iterations,
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Power Method', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 55 });

    // Inverse Iteration
    try {
        const start = performance.now();
        const res = inverseIteration(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Inverse Iteration',
            time: time.toFixed(2),
            smallest: res.smallestEigenvalue?.toFixed(6) || '-',
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Inverse Iteration', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 80 });

    // Shifted QR
    try {
        const start = performance.now();
        const res = shiftedQR(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Shifted QR',
            time: time.toFixed(2),
            count: res.eigenvalues.length,
            traceError: res.verification.traceError.toExponential(2),
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Shifted QR', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Get best result
    let bestResult = null;
    try {
        bestResult = shiftedQR(A);
    } catch (e) {}

    return {
        algorithm: 'Algorithm Comparison',
        comparison: results,
        eigenvalues: bestResult?.eigenvalues,
        matrixSize: n,
        trace: computeTrace(A),
        description: 'Comparison of eigenvalue algorithms'
    };
}

// ========== Helper Functions ==========

function hessenberg(A) {
    const n = A.length;
    const H = A.map(row => [...row]);

    for (let k = 0; k < n - 2; k++) {
        // Extract column below diagonal
        const x = [];
        for (let i = k + 1; i < n; i++) {
            x.push(H[i][k]);
        }

        const norm = Math.sqrt(x.reduce((sum, val) => sum + val * val, 0));
        if (norm < 1e-14) continue;

        const sign = x[0] >= 0 ? 1 : -1;
        x[0] += sign * norm;

        const vNorm = Math.sqrt(x.reduce((sum, val) => sum + val * val, 0));
        const v = x.map(val => val / vNorm);

        // Apply H = I - 2vv^T from left and right
        // H * A
        for (let j = k; j < n; j++) {
            let dot = 0;
            for (let i = 0; i < v.length; i++) {
                dot += v[i] * H[k + 1 + i][j];
            }
            for (let i = 0; i < v.length; i++) {
                H[k + 1 + i][j] -= 2 * dot * v[i];
            }
        }

        // A * H
        for (let i = 0; i < n; i++) {
            let dot = 0;
            for (let j = 0; j < v.length; j++) {
                dot += H[i][k + 1 + j] * v[j];
            }
            for (let j = 0; j < v.length; j++) {
                H[i][k + 1 + j] -= 2 * dot * v[j];
            }
        }
    }

    return H;
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

    // Modified Gram-Schmidt
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

function extractEigenvalues(T) {
    const n = T.length;
    const eigenvalues = [];

    let i = 0;
    while (i < n) {
        if (i === n - 1 || Math.abs(T[i + 1][i]) < 1e-10) {
            // Real eigenvalue
            eigenvalues.push({ real: T[i][i], imag: 0 });
            i++;
        } else {
            // Complex conjugate pair from 2x2 block
            const a = T[i][i];
            const b = T[i][i + 1];
            const c = T[i + 1][i];
            const d = T[i + 1][i + 1];

            const trace = a + d;
            const det = a * d - b * c;
            const disc = trace * trace - 4 * det;

            if (disc >= 0) {
                eigenvalues.push({ real: (trace + Math.sqrt(disc)) / 2, imag: 0 });
                eigenvalues.push({ real: (trace - Math.sqrt(disc)) / 2, imag: 0 });
            } else {
                eigenvalues.push({ real: trace / 2, imag: Math.sqrt(-disc) / 2 });
                eigenvalues.push({ real: trace / 2, imag: -Math.sqrt(-disc) / 2 });
            }
            i += 2;
        }
    }

    // Sort by real part descending
    eigenvalues.sort((a, b) => b.real - a.real);

    return eigenvalues;
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

function dotProduct(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

function normalize(v) {
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    if (norm < 1e-14) return v;
    return v.map(x => x / norm);
}

function computeTrace(A) {
    let trace = 0;
    for (let i = 0; i < A.length; i++) {
        trace += A[i][i];
    }
    return trace;
}

function luDecomposition(A) {
    const n = A.length;
    const LU = A.map(row => [...row]);
    const P = [];
    for (let i = 0; i < n; i++) P[i] = i;

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

        if (maxRow !== k) {
            [LU[k], LU[maxRow]] = [LU[maxRow], LU[k]];
            [P[k], P[maxRow]] = [P[maxRow], P[k]];
        }

        if (Math.abs(LU[k][k]) < 1e-14) continue;

        for (let i = k + 1; i < n; i++) {
            LU[i][k] /= LU[k][k];
            for (let j = k + 1; j < n; j++) {
                LU[i][j] -= LU[i][k] * LU[k][j];
            }
        }
    }

    // Extract L and U
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
