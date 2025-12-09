/**
 * Matrix Exponential Worker
 * Implements Padé approximation with scaling and squaring
 */

/**
 * Matrix multiplication C = A * B
 */
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

/**
 * Matrix addition C = A + B
 */
function matAdd(A, B, n) {
    const C = new Float64Array(n * n);
    for (let i = 0; i < n * n; i++) {
        C[i] = A[i] + B[i];
    }
    return C;
}

/**
 * Matrix subtraction C = A - B
 */
function matSub(A, B, n) {
    const C = new Float64Array(n * n);
    for (let i = 0; i < n * n; i++) {
        C[i] = A[i] - B[i];
    }
    return C;
}

/**
 * Scalar multiplication C = s * A
 */
function scalarMul(s, A, n) {
    const C = new Float64Array(n * n);
    for (let i = 0; i < n * n; i++) {
        C[i] = s * A[i];
    }
    return C;
}

/**
 * Identity matrix
 */
function eye(n) {
    const I = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        I[i * n + i] = 1;
    }
    return I;
}

/**
 * Frobenius norm
 */
function frobNorm(A, n) {
    let sum = 0;
    for (let i = 0; i < n * n; i++) {
        sum += A[i] * A[i];
    }
    return Math.sqrt(sum);
}

/**
 * 1-norm (maximum column sum)
 */
function norm1(A, n) {
    let maxSum = 0;
    for (let j = 0; j < n; j++) {
        let colSum = 0;
        for (let i = 0; i < n; i++) {
            colSum += Math.abs(A[i * n + j]);
        }
        if (colSum > maxSum) maxSum = colSum;
    }
    return maxSum;
}

/**
 * LU decomposition with partial pivoting
 */
function luDecomp(A, n) {
    const LU = new Float64Array(A);
    const perm = new Int32Array(n);
    for (let i = 0; i < n; i++) perm[i] = i;

    for (let k = 0; k < n - 1; k++) {
        // Find pivot
        let maxVal = Math.abs(LU[k * n + k]);
        let maxIdx = k;
        for (let i = k + 1; i < n; i++) {
            const val = Math.abs(LU[i * n + k]);
            if (val > maxVal) {
                maxVal = val;
                maxIdx = i;
            }
        }

        // Swap rows
        if (maxIdx !== k) {
            [perm[k], perm[maxIdx]] = [perm[maxIdx], perm[k]];
            for (let j = 0; j < n; j++) {
                [LU[k * n + j], LU[maxIdx * n + j]] = [LU[maxIdx * n + j], LU[k * n + j]];
            }
        }

        // Elimination
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

/**
 * Solve Ax = b using LU decomposition
 */
function luSolve(LU, perm, b, n) {
    const x = new Float64Array(n);
    const y = new Float64Array(n);

    // Forward substitution (Ly = Pb)
    for (let i = 0; i < n; i++) {
        y[i] = b[perm[i]];
        for (let j = 0; j < i; j++) {
            y[i] -= LU[i * n + j] * y[j];
        }
    }

    // Back substitution (Ux = y)
    for (let i = n - 1; i >= 0; i--) {
        x[i] = y[i];
        for (let j = i + 1; j < n; j++) {
            x[i] -= LU[i * n + j] * x[j];
        }
        if (Math.abs(LU[i * n + i]) > 1e-15) {
            x[i] /= LU[i * n + i];
        }
    }

    return x;
}

/**
 * Matrix inverse using LU decomposition
 */
function matInv(A, n) {
    const { LU, perm } = luDecomp(A, n);
    const inv = new Float64Array(n * n);

    const e = new Float64Array(n);
    for (let j = 0; j < n; j++) {
        e.fill(0);
        e[j] = 1;
        const col = luSolve(LU, perm, e, n);
        for (let i = 0; i < n; i++) {
            inv[i * n + j] = col[i];
        }
    }

    return inv;
}

/**
 * Padé approximation coefficients for order p
 */
function padeCoeffs(p) {
    const c = new Float64Array(p + 1);
    c[0] = 1;
    for (let k = 1; k <= p; k++) {
        c[k] = c[k - 1] * (p - k + 1) / (k * (2 * p - k + 1));
    }
    return c;
}

/**
 * Matrix exponential using Padé approximation with scaling and squaring
 * Uses [p/p] Padé approximant
 */
function padeExpm(A, n, p = 6) {
    // Scaling: find s such that ||A/2^s|| < 1
    const normA = norm1(A, n);
    const s = Math.max(0, Math.ceil(Math.log2(normA)));

    // Scale A
    let scaledA = scalarMul(Math.pow(2, -s), A, n);

    postMessage({ type: 'progress', percentage: 10 });

    // Padé coefficients
    const c = padeCoeffs(p);

    // Compute powers of A
    const Apowers = [eye(n), scaledA];
    for (let k = 2; k <= p; k++) {
        Apowers.push(matMul(Apowers[k - 1], scaledA, n));
        postMessage({ type: 'progress', percentage: 10 + Math.floor((k / p) * 30) });
    }

    // Compute U and V for Padé: e^A ≈ (V + U) / (V - U)
    // U = sum of odd terms, V = sum of even terms
    let U = new Float64Array(n * n);
    let V = new Float64Array(n * n);

    for (let k = p; k >= 1; k--) {
        if (k % 2 === 1) {
            U = matAdd(U, scalarMul(c[k], Apowers[k], n), n);
        } else {
            V = matAdd(V, scalarMul(c[k], Apowers[k], n), n);
        }
    }
    V = matAdd(V, scalarMul(c[0], eye(n), n), n);

    postMessage({ type: 'progress', percentage: 50 });

    // Compute (V - U)^(-1) * (V + U)
    const VplusU = matAdd(V, U, n);
    const VminusU = matSub(V, U, n);
    const VminusUinv = matInv(VminusU, n);

    let result = matMul(VminusUinv, VplusU, n);

    postMessage({ type: 'progress', percentage: 70 });

    // Squaring: compute (e^(A/2^s))^(2^s)
    for (let k = 0; k < s; k++) {
        result = matMul(result, result, n);
        postMessage({ type: 'progress', percentage: 70 + Math.floor(((k + 1) / s) * 30) });
    }

    return result;
}

/**
 * Taylor series approximation for e^A
 */
function taylorExpm(A, n, terms = 20) {
    let result = eye(n);
    let term = eye(n);

    for (let k = 1; k <= terms; k++) {
        term = scalarMul(1 / k, matMul(term, A, n), n);
        result = matAdd(result, term, n);

        if (frobNorm(term, n) < 1e-16 * frobNorm(result, n)) {
            break;
        }

        postMessage({ type: 'progress', percentage: Math.floor((k / terms) * 100) });
    }

    return result;
}

/**
 * Simple eigenvalue decomposition for small symmetric matrices
 * Returns approximate exponential using power method
 */
function eigenExpm(A, n, maxIter = 100) {
    // This is a simplified version that works best for symmetric matrices
    // Uses scaling and Taylor for demonstration
    const normA = norm1(A, n);

    if (normA < 1) {
        return taylorExpm(A, n, 30);
    }

    // Scale and use Taylor
    const s = Math.ceil(Math.log2(normA)) + 1;
    const scaledA = scalarMul(Math.pow(2, -s), A, n);
    let result = taylorExpm(scaledA, n, 20);

    // Square back
    for (let k = 0; k < s; k++) {
        result = matMul(result, result, n);
        postMessage({ type: 'progress', percentage: Math.floor(((k + 1) / s) * 100) });
    }

    return result;
}

/**
 * Generate random matrix
 */
function generateRandomMatrix(n, type, scale) {
    const A = new Float64Array(n * n);

    switch (type) {
        case 'symmetric':
            for (let i = 0; i < n; i++) {
                for (let j = i; j < n; j++) {
                    const val = (Math.random() * 2 - 1) * scale;
                    A[i * n + j] = val;
                    A[j * n + i] = val;
                }
            }
            break;

        case 'skewSymmetric':
            for (let i = 0; i < n; i++) {
                A[i * n + i] = 0;
                for (let j = i + 1; j < n; j++) {
                    const val = (Math.random() * 2 - 1) * scale;
                    A[i * n + j] = val;
                    A[j * n + i] = -val;
                }
            }
            break;

        case 'nilpotent':
            // Upper triangular with zeros on diagonal (nilpotent)
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    A[i * n + j] = (Math.random() * 2 - 1) * scale;
                }
            }
            break;

        case 'general':
        default:
            for (let i = 0; i < n * n; i++) {
                A[i] = (Math.random() * 2 - 1) * scale;
            }
            break;
    }

    return A;
}

/**
 * Compute trace
 */
function trace(A, n) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
        sum += A[i * n + i];
    }
    return sum;
}

/**
 * Compute determinant (for small matrices using LU)
 */
function det(A, n) {
    const { LU, perm } = luDecomp(A, n);
    let d = 1;
    let swaps = 0;

    for (let i = 0; i < n; i++) {
        d *= LU[i * n + i];
        if (perm[i] !== i) swaps++;
    }

    return swaps % 2 === 0 ? d : -d;
}

/**
 * Extract submatrix for display
 */
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

// Operation handlers
function handlePade(data) {
    const { A, n } = data;
    const startTime = performance.now();

    const expA = padeExpm(A, n);

    const executionTime = performance.now() - startTime;

    // Verify: det(e^A) should equal e^tr(A)
    const trA = trace(A, n);
    const detExpA = n <= 10 ? det(expA, n) : null;

    return {
        algorithm: 'Padé Approximation',
        description: '[6/6] Padé with scaling and squaring',
        matrixSize: n,
        inputNorm: norm1(A, n),
        traceA: trA,
        expectedDet: Math.exp(trA),
        actualDet: detExpA,
        outputNorm: frobNorm(expA, n),
        submatrix: extractSubmatrix(expA, n),
        executionTime
    };
}

function handleTaylor(data) {
    const { A, n } = data;
    const startTime = performance.now();

    const expA = taylorExpm(A, n, 30);

    const executionTime = performance.now() - startTime;

    return {
        algorithm: 'Taylor Series',
        description: 'Truncated at 30 terms',
        matrixSize: n,
        inputNorm: norm1(A, n),
        outputNorm: frobNorm(expA, n),
        submatrix: extractSubmatrix(expA, n),
        executionTime
    };
}

function handleEigen(data) {
    const { A, n } = data;
    const startTime = performance.now();

    const expA = eigenExpm(A, n);

    const executionTime = performance.now() - startTime;

    return {
        algorithm: 'Eigenvalue Method',
        description: 'Scaled Taylor (simplified)',
        matrixSize: n,
        inputNorm: norm1(A, n),
        outputNorm: frobNorm(expA, n),
        submatrix: extractSubmatrix(expA, n),
        executionTime
    };
}

function handleCompare(data) {
    const { A, n } = data;
    const results = [];

    // Padé
    postMessage({ type: 'progress', percentage: 10 });
    let start = performance.now();
    const expPade = padeExpm(A, n);
    results.push({
        algorithm: 'Padé [6/6]',
        time: (performance.now() - start).toFixed(2),
        norm: frobNorm(expPade, n).toExponential(2)
    });

    // Taylor
    postMessage({ type: 'progress', percentage: 40 });
    start = performance.now();
    const expTaylor = taylorExpm(A, n, 30);
    const taylorDiff = frobNorm(matSub(expPade, expTaylor, n), n);
    results.push({
        algorithm: 'Taylor (30)',
        time: (performance.now() - start).toFixed(2),
        norm: frobNorm(expTaylor, n).toExponential(2),
        diff: taylorDiff.toExponential(2)
    });

    // Eigen-based
    postMessage({ type: 'progress', percentage: 70 });
    start = performance.now();
    const expEigen = eigenExpm(A, n);
    const eigenDiff = frobNorm(matSub(expPade, expEigen, n), n);
    results.push({
        algorithm: 'Eigen Method',
        time: (performance.now() - start).toFixed(2),
        norm: frobNorm(expEigen, n).toExponential(2),
        diff: eigenDiff.toExponential(2)
    });

    postMessage({ type: 'progress', percentage: 100 });

    return {
        algorithm: 'Algorithm Comparison',
        description: 'Comparing all methods',
        matrixSize: n,
        inputNorm: norm1(A, n),
        comparison: results,
        submatrix: extractSubmatrix(expPade, n)
    };
}

// Message handler
self.onmessage = function(e) {
    const { type, data } = e.data;

    try {
        let result;
        const startTime = performance.now();

        // Generate data if needed
        if (data.generate) {
            data.A = generateRandomMatrix(data.n, data.matrixType, data.scale);
        }

        switch (type) {
            case 'pade':
                result = handlePade(data);
                break;
            case 'taylor':
                result = handleTaylor(data);
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
