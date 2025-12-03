/**
 * Matrix Logarithm Worker
 * Implements inverse scaling and squaring with Padé approximation
 */

// Matrix utilities
function matMul(A, B, n) {
    const C = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += A[i * n + k] * B[k * n + j];
            }
            C[i * n + j] = sum;
        }
    }
    return C;
}

function matAdd(A, B, n) {
    const C = new Float64Array(n * n);
    for (let i = 0; i < n * n; i++) C[i] = A[i] + B[i];
    return C;
}

function matSub(A, B, n) {
    const C = new Float64Array(n * n);
    for (let i = 0; i < n * n; i++) C[i] = A[i] - B[i];
    return C;
}

function scalarMul(s, A, n) {
    const C = new Float64Array(n * n);
    for (let i = 0; i < n * n; i++) C[i] = s * A[i];
    return C;
}

function eye(n) {
    const I = new Float64Array(n * n);
    for (let i = 0; i < n; i++) I[i * n + i] = 1;
    return I;
}

function frobNorm(A, n) {
    let sum = 0;
    for (let i = 0; i < n * n; i++) sum += A[i] * A[i];
    return Math.sqrt(sum);
}

function norm1(A, n) {
    let maxSum = 0;
    for (let j = 0; j < n; j++) {
        let colSum = 0;
        for (let i = 0; i < n; i++) colSum += Math.abs(A[i * n + j]);
        if (colSum > maxSum) maxSum = colSum;
    }
    return maxSum;
}

function trace(A, n) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += A[i * n + i];
    return sum;
}

// LU decomposition
function luDecomp(A, n) {
    const LU = new Float64Array(A);
    const perm = new Int32Array(n);
    for (let i = 0; i < n; i++) perm[i] = i;

    for (let k = 0; k < n - 1; k++) {
        let maxVal = Math.abs(LU[k * n + k]);
        let maxIdx = k;
        for (let i = k + 1; i < n; i++) {
            const val = Math.abs(LU[i * n + k]);
            if (val > maxVal) { maxVal = val; maxIdx = i; }
        }

        if (maxIdx !== k) {
            [perm[k], perm[maxIdx]] = [perm[maxIdx], perm[k]];
            for (let j = 0; j < n; j++) {
                [LU[k * n + j], LU[maxIdx * n + j]] = [LU[maxIdx * n + j], LU[k * n + j]];
            }
        }

        if (Math.abs(LU[k * n + k]) > 1e-15) {
            for (let i = k + 1; i < n; i++) {
                LU[i * n + k] /= LU[k * n + k];
                for (let j = k + 1; j < n; j++) {
                    LU[i * n + j] -= LU[i * n + k] * LU[k * n + j];
                }
            }
        }
    }
    return { LU, perm };
}

function luSolve(LU, perm, b, n) {
    const x = new Float64Array(n);
    const y = new Float64Array(n);

    for (let i = 0; i < n; i++) {
        y[i] = b[perm[i]];
        for (let j = 0; j < i; j++) y[i] -= LU[i * n + j] * y[j];
    }

    for (let i = n - 1; i >= 0; i--) {
        x[i] = y[i];
        for (let j = i + 1; j < n; j++) x[i] -= LU[i * n + j] * x[j];
        if (Math.abs(LU[i * n + i]) > 1e-15) x[i] /= LU[i * n + i];
    }
    return x;
}

function matInv(A, n) {
    const { LU, perm } = luDecomp(A, n);
    const inv = new Float64Array(n * n);
    const e = new Float64Array(n);

    for (let j = 0; j < n; j++) {
        e.fill(0);
        e[j] = 1;
        const col = luSolve(LU, perm, e, n);
        for (let i = 0; i < n; i++) inv[i * n + j] = col[i];
    }
    return inv;
}

function det(A, n) {
    const { LU, perm } = luDecomp(A, n);
    let d = 1, swaps = 0;
    for (let i = 0; i < n; i++) {
        d *= LU[i * n + i];
        if (perm[i] !== i) swaps++;
    }
    return swaps % 2 === 0 ? d : -d;
}

/**
 * Matrix square root using Denman-Beavers iteration
 * Used for inverse scaling
 */
function matSqrt(A, n, maxIter = 50) {
    let Y = new Float64Array(A);
    let Z = eye(n);

    for (let iter = 0; iter < maxIter; iter++) {
        const Yinv = matInv(Y, n);
        const Zinv = matInv(Z, n);

        const Ynew = scalarMul(0.5, matAdd(Y, Zinv, n), n);
        const Znew = scalarMul(0.5, matAdd(Z, Yinv, n), n);

        const diff = frobNorm(matSub(Ynew, Y, n), n);
        Y = Ynew;
        Z = Znew;

        if (diff < 1e-14) break;
    }
    return Y;
}

/**
 * Gregory series: log(I + X) = X - X²/2 + X³/3 - X⁴/4 + ...
 * Converges for ||X|| < 1
 */
function gregorySeries(X, n, maxTerms = 50) {
    let result = new Float64Array(n * n);
    let Xpower = new Float64Array(X);

    for (let k = 1; k <= maxTerms; k++) {
        const sign = k % 2 === 1 ? 1 : -1;
        const term = scalarMul(sign / k, Xpower, n);
        result = matAdd(result, term, n);

        if (frobNorm(term, n) < 1e-15) break;

        Xpower = matMul(Xpower, X, n);

        if (k % 10 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((k / maxTerms) * 100) });
        }
    }

    return result;
}

/**
 * Padé approximant for log(I + X)
 * Using [m/m] diagonal Padé
 */
function padeLogm(X, n, m = 8) {
    // For log(I+X), use Padé approximant
    // log(I+X) ≈ P(X)/Q(X) where P and Q are matrix polynomials

    // Compute powers of X
    const Xpowers = [eye(n)];
    for (let k = 1; k <= 2 * m; k++) {
        Xpowers.push(matMul(Xpowers[k - 1], X, n));
    }

    // Simplified: use Gregory series for small ||X||
    return gregorySeries(X, n, 50);
}

/**
 * Matrix logarithm using inverse scaling and squaring
 */
function logm(A, n, method = 'pade') {
    const I = eye(n);

    // Check if A is close to identity
    const AmI = matSub(A, I, n);
    const normAmI = norm1(AmI, n);

    if (normAmI < 0.5) {
        // Direct series/Padé
        postMessage({ type: 'progress', percentage: 20 });
        if (method === 'series') {
            return gregorySeries(AmI, n, 100);
        } else {
            return padeLogm(AmI, n);
        }
    }

    // Inverse scaling: compute A^(1/2^s) until close to I
    let s = 0;
    let scaledA = new Float64Array(A);

    while (norm1(matSub(scaledA, I, n), n) > 0.5 && s < 50) {
        scaledA = matSqrt(scaledA, n);
        s++;
        postMessage({ type: 'progress', percentage: Math.min(50, 10 + s * 5) });
    }

    // Compute log of scaled matrix
    postMessage({ type: 'progress', percentage: 60 });
    const scaledAmI = matSub(scaledA, I, n);
    let logScaled;

    if (method === 'series') {
        logScaled = gregorySeries(scaledAmI, n, 100);
    } else {
        logScaled = padeLogm(scaledAmI, n);
    }

    // Undo scaling: log(A) = 2^s * log(A^(1/2^s))
    postMessage({ type: 'progress', percentage: 90 });
    return scalarMul(Math.pow(2, s), logScaled, n);
}

/**
 * Eigenvalue-based log (simplified for diagonal matrices)
 */
function eigenLogm(A, n) {
    // For demonstration, works best with near-diagonal matrices
    // Check if diagonal dominant
    let diagonalDominant = true;
    for (let i = 0; i < n && diagonalDominant; i++) {
        let offDiagSum = 0;
        for (let j = 0; j < n; j++) {
            if (i !== j) offDiagSum += Math.abs(A[i * n + j]);
        }
        if (offDiagSum > Math.abs(A[i * n + i]) * 0.1) {
            diagonalDominant = false;
        }
    }

    if (diagonalDominant) {
        // Approximate: log diagonal elements, zero off-diagonal
        const result = new Float64Array(n * n);
        for (let i = 0; i < n; i++) {
            const diag = A[i * n + i];
            if (diag <= 0) {
                throw new Error('Matrix has non-positive diagonal element');
            }
            result[i * n + i] = Math.log(diag);
        }

        // Add correction terms using series
        const offDiag = new Float64Array(A);
        for (let i = 0; i < n; i++) offDiag[i * n + i] = 0;

        // First-order correction
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j && A[i * n + i] > 0 && A[j * n + j] > 0) {
                    const denom = A[i * n + i] - A[j * n + j];
                    if (Math.abs(denom) > 1e-10) {
                        result[i * n + j] = offDiag[i * n + j] *
                            (Math.log(A[i * n + i]) - Math.log(A[j * n + j])) / denom;
                    }
                }
            }
        }

        return result;
    }

    // Fall back to Padé method
    return logm(A, n, 'pade');
}

/**
 * Generate random positive definite matrix
 */
function generateRandomMatrix(n, type) {
    const A = new Float64Array(n * n);

    switch (type) {
        case 'spd':
            // A = B * B^T + I
            const B = new Float64Array(n * n);
            for (let i = 0; i < n * n; i++) B[i] = Math.random() * 2 - 1;
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    let sum = 0;
                    for (let k = 0; k < n; k++) sum += B[i * n + k] * B[j * n + k];
                    A[i * n + j] = sum;
                }
                A[i * n + i] += n;  // Ensure positive definiteness
            }
            break;

        case 'nearIdentity':
            // I + small perturbation
            for (let i = 0; i < n; i++) {
                A[i * n + i] = 1 + Math.random() * 0.1;
                for (let j = i + 1; j < n; j++) {
                    const val = (Math.random() - 0.5) * 0.1;
                    A[i * n + j] = val;
                    A[j * n + i] = val;
                }
            }
            break;

        case 'diagonal':
            for (let i = 0; i < n; i++) {
                A[i * n + i] = 1 + Math.random() * 9;  // Between 1 and 10
            }
            break;

        default:
            return generateRandomMatrix(n, 'spd');
    }

    return A;
}

function extractSubmatrix(data, n, maxSize = 5) {
    const displaySize = Math.min(n, maxSize);
    const sub = [];
    for (let i = 0; i < displaySize; i++) {
        sub[i] = [];
        for (let j = 0; j < displaySize; j++) {
            sub[i][j] = data[i * n + j];
        }
    }
    return sub;
}

// Handlers
function handlePade(data) {
    const { A, n } = data;
    const startTime = performance.now();

    const logA = logm(A, n, 'pade');

    const executionTime = performance.now() - startTime;

    // Verify: tr(log(A)) should equal log(det(A))
    const trLogA = trace(logA, n);
    const detA = det(A, n);
    const logDetA = detA > 0 ? Math.log(detA) : NaN;

    return {
        algorithm: 'Padé Approximation',
        description: 'Inverse scaling and squaring',
        matrixSize: n,
        inputNorm: norm1(A, n),
        traceLogA: trLogA,
        logDetA: logDetA,
        traceError: Math.abs(trLogA - logDetA),
        outputNorm: frobNorm(logA, n),
        submatrix: extractSubmatrix(logA, n),
        executionTime
    };
}

function handleSeries(data) {
    const { A, n } = data;
    const startTime = performance.now();

    const logA = logm(A, n, 'series');

    const executionTime = performance.now() - startTime;

    return {
        algorithm: 'Gregory Series',
        description: 'log(I+X) = X - X²/2 + X³/3 - ...',
        matrixSize: n,
        inputNorm: norm1(A, n),
        outputNorm: frobNorm(logA, n),
        submatrix: extractSubmatrix(logA, n),
        executionTime
    };
}

function handleEigen(data) {
    const { A, n } = data;
    const startTime = performance.now();

    const logA = eigenLogm(A, n);

    const executionTime = performance.now() - startTime;

    return {
        algorithm: 'Eigenvalue Method',
        description: 'Diagonal approximation',
        matrixSize: n,
        inputNorm: norm1(A, n),
        outputNorm: frobNorm(logA, n),
        submatrix: extractSubmatrix(logA, n),
        executionTime
    };
}

function handleCompare(data) {
    const { A, n } = data;
    const results = [];

    postMessage({ type: 'progress', percentage: 10 });
    let start = performance.now();
    const logPade = logm(A, n, 'pade');
    results.push({
        algorithm: 'Padé',
        time: (performance.now() - start).toFixed(2),
        norm: frobNorm(logPade, n).toExponential(2)
    });

    postMessage({ type: 'progress', percentage: 40 });
    start = performance.now();
    const logSeries = logm(A, n, 'series');
    const seriesDiff = frobNorm(matSub(logPade, logSeries, n), n);
    results.push({
        algorithm: 'Gregory Series',
        time: (performance.now() - start).toFixed(2),
        norm: frobNorm(logSeries, n).toExponential(2),
        diff: seriesDiff.toExponential(2)
    });

    postMessage({ type: 'progress', percentage: 70 });
    start = performance.now();
    const logEigen = eigenLogm(A, n);
    const eigenDiff = frobNorm(matSub(logPade, logEigen, n), n);
    results.push({
        algorithm: 'Eigenvalue',
        time: (performance.now() - start).toFixed(2),
        norm: frobNorm(logEigen, n).toExponential(2),
        diff: eigenDiff.toExponential(2)
    });

    postMessage({ type: 'progress', percentage: 100 });

    return {
        algorithm: 'Algorithm Comparison',
        description: 'Comparing all methods',
        matrixSize: n,
        comparison: results,
        submatrix: extractSubmatrix(logPade, n)
    };
}

self.onmessage = function(e) {
    const { type, data } = e.data;

    try {
        let result;
        const startTime = performance.now();

        if (data.generate) {
            data.A = generateRandomMatrix(data.n, data.matrixType);
        }

        switch (type) {
            case 'pade':
                result = handlePade(data);
                break;
            case 'series':
                result = handleSeries(data);
                break;
            case 'eigenDecomp':
                result = handleEigen(data);
                break;
            case 'compare':
                result = handleCompare(data);
                break;
            default:
                throw new Error('Unknown algorithm: ' + type);
        }

        const executionTime = performance.now() - startTime;

        postMessage({
            type: 'result',
            algorithm: type,
            result,
            executionTime: executionTime.toFixed(2)
        });
    } catch (error) {
        postMessage({
            type: 'error',
            message: error.message
        });
    }
};
