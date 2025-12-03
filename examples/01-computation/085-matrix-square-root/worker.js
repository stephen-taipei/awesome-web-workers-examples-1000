/**
 * Web Worker for Matrix Square Root computation
 * Implements multiple algorithms for computing A^(1/2)
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let A, n;

        if (data.generate) {
            n = data.n;
            A = generateMatrix(n, data.matrixType);
        } else {
            A = new Float64Array(data.A);
            n = data.n;
        }

        let result;

        switch (type) {
            case 'denmanBeavers':
                result = computeDenmanBeavers(A, n);
                break;
            case 'newtonSchulz':
                result = computeNewtonSchulz(A, n);
                break;
            case 'eigenDecomp':
                result = computeEigenSqrt(A, n);
                break;
            case 'padeApprox':
                result = computePadeSqrt(A, n);
                break;
            case 'compare':
                result = compareAlgorithms(A, n);
                break;
            default:
                throw new Error('Unknown algorithm: ' + type);
        }

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            algorithm: type,
            result,
            executionTime
        });
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error.message
        });
    }
};

function reportProgress(percent) {
    self.postMessage({ type: 'progress', percentage: Math.round(percent) });
}

// Matrix generation functions
function generateMatrix(n, matrixType) {
    const A = new Float64Array(n * n);

    switch (matrixType) {
        case 'spd':
            // Generate symmetric positive definite
            const B = new Float64Array(n * n);
            for (let i = 0; i < n * n; i++) {
                B[i] = Math.random() - 0.5;
            }
            // A = B * B^T + I (guarantees SPD)
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    let sum = (i === j) ? 1 : 0;
                    for (let k = 0; k < n; k++) {
                        sum += B[i * n + k] * B[j * n + k];
                    }
                    A[i * n + j] = sum;
                }
            }
            break;

        case 'nearIdentity':
            // A = I + epsilon * random SPD
            const eps = 0.1;
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j) {
                        A[i * n + j] = 1 + eps * Math.random();
                    } else {
                        const val = eps * 0.1 * (Math.random() - 0.5);
                        A[i * n + j] = val;
                        A[j * n + i] = val;
                    }
                }
            }
            break;

        case 'diagonal':
            for (let i = 0; i < n; i++) {
                A[i * n + i] = 1 + Math.random() * 9; // 1 to 10
            }
            break;

        case 'perfectSquare':
            // Generate B and compute A = B * B
            const Bmat = new Float64Array(n * n);
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j) {
                        Bmat[i * n + j] = 1 + Math.random() * 2;
                    } else {
                        const val = 0.3 * (Math.random() - 0.5);
                        Bmat[i * n + j] = val;
                        Bmat[j * n + i] = val;
                    }
                }
            }
            matMul(Bmat, Bmat, A, n);
            break;

        default:
            throw new Error('Unknown matrix type');
    }

    return A;
}

// Matrix operations
function matMul(A, B, C, n) {
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += A[i * n + k] * B[k * n + j];
            }
            C[i * n + j] = sum;
        }
    }
}

function matAdd(A, B, C, n) {
    for (let i = 0; i < n * n; i++) {
        C[i] = A[i] + B[i];
    }
}

function matSub(A, B, C, n) {
    for (let i = 0; i < n * n; i++) {
        C[i] = A[i] - B[i];
    }
}

function matScale(A, scalar, B, n) {
    for (let i = 0; i < n * n; i++) {
        B[i] = A[i] * scalar;
    }
}

function matCopy(src, dst) {
    for (let i = 0; i < src.length; i++) {
        dst[i] = src[i];
    }
}

function identity(n) {
    const I = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        I[i * n + i] = 1;
    }
    return I;
}

function frobeniusNorm(A) {
    let sum = 0;
    for (let i = 0; i < A.length; i++) {
        sum += A[i] * A[i];
    }
    return Math.sqrt(sum);
}

function trace(A, n) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
        sum += A[i * n + i];
    }
    return sum;
}

function oneNorm(A, n) {
    let maxSum = 0;
    for (let j = 0; j < n; j++) {
        let colSum = 0;
        for (let i = 0; i < n; i++) {
            colSum += Math.abs(A[i * n + j]);
        }
        maxSum = Math.max(maxSum, colSum);
    }
    return maxSum;
}

// Matrix inverse using Gauss-Jordan
function matInverse(A, n) {
    const aug = new Float64Array(n * 2 * n);

    // Create augmented matrix [A | I]
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            aug[i * 2 * n + j] = A[i * n + j];
        }
        aug[i * 2 * n + n + i] = 1;
    }

    // Gauss-Jordan elimination
    for (let i = 0; i < n; i++) {
        // Find pivot
        let maxVal = Math.abs(aug[i * 2 * n + i]);
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(aug[k * 2 * n + i]) > maxVal) {
                maxVal = Math.abs(aug[k * 2 * n + i]);
                maxRow = k;
            }
        }

        if (maxVal < 1e-14) {
            throw new Error('Matrix is singular');
        }

        // Swap rows
        if (maxRow !== i) {
            for (let j = 0; j < 2 * n; j++) {
                const temp = aug[i * 2 * n + j];
                aug[i * 2 * n + j] = aug[maxRow * 2 * n + j];
                aug[maxRow * 2 * n + j] = temp;
            }
        }

        // Scale pivot row
        const pivot = aug[i * 2 * n + i];
        for (let j = 0; j < 2 * n; j++) {
            aug[i * 2 * n + j] /= pivot;
        }

        // Eliminate column
        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = aug[k * 2 * n + i];
                for (let j = 0; j < 2 * n; j++) {
                    aug[k * 2 * n + j] -= factor * aug[i * 2 * n + j];
                }
            }
        }
    }

    // Extract inverse
    const inv = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            inv[i * n + j] = aug[i * 2 * n + n + j];
        }
    }

    return inv;
}

/**
 * Denman-Beavers iteration for matrix square root
 * Y_0 = A, Z_0 = I
 * Y_{k+1} = (Y_k + Z_k^{-1}) / 2
 * Z_{k+1} = (Z_k + Y_k^{-1}) / 2
 * Converges: Y → √A, Z → √A^{-1}
 */
function denmanBeavers(A, n, maxIter = 100, tol = 1e-12) {
    let Y = new Float64Array(A);
    let Z = identity(n);
    const I = identity(n);

    let iterations = 0;

    for (let iter = 0; iter < maxIter; iter++) {
        iterations = iter + 1;

        if (iter % 5 === 0) {
            reportProgress(10 + 70 * iter / maxIter);
        }

        // Y_new = (Y + Z^{-1}) / 2
        const Zinv = matInverse(Z, n);
        const Yinv = matInverse(Y, n);

        const Ynew = new Float64Array(n * n);
        const Znew = new Float64Array(n * n);

        for (let i = 0; i < n * n; i++) {
            Ynew[i] = 0.5 * (Y[i] + Zinv[i]);
            Znew[i] = 0.5 * (Z[i] + Yinv[i]);
        }

        // Check convergence: ||Y_new - Y||
        const diff = new Float64Array(n * n);
        matSub(Ynew, Y, diff, n);
        const relError = frobeniusNorm(diff) / frobeniusNorm(Y);

        Y = Ynew;
        Z = Znew;

        if (relError < tol) {
            break;
        }
    }

    return { result: Y, iterations };
}

function computeDenmanBeavers(A, n) {
    reportProgress(10);

    const inputNorm = oneNorm(A, n);
    const startTime = performance.now();

    const { result, iterations } = denmanBeavers(A, n);

    const execTime = performance.now() - startTime;
    reportProgress(85);

    // Verify: ||√A × √A - A||
    const sqrtAsq = new Float64Array(n * n);
    matMul(result, result, sqrtAsq, n);
    const diff = new Float64Array(n * n);
    matSub(sqrtAsq, A, diff, n);
    const verificationError = frobeniusNorm(diff) / frobeniusNorm(A);

    const outputNorm = frobeniusNorm(result);

    reportProgress(100);

    // Extract submatrix for display
    const displaySize = Math.min(5, n);
    const submatrix = [];
    for (let i = 0; i < displaySize; i++) {
        const row = [];
        for (let j = 0; j < displaySize; j++) {
            row.push(result[i * n + j]);
        }
        submatrix.push(row);
    }

    return {
        algorithm: 'Denman-Beavers Iteration',
        description: 'Coupled iteration Y → √A, Z → √A⁻¹',
        matrixSize: n,
        inputNorm,
        outputNorm,
        iterations,
        verificationError,
        executionTime: execTime,
        submatrix
    };
}

/**
 * Newton-Schulz iteration for matrix square root
 * Requires ||A - I|| < 1 for convergence
 * X_0 = A
 * X_{k+1} = (1/2) X_k (3I - X_k^2)
 */
function newtonSchulz(A, n, maxIter = 50, tol = 1e-12) {
    // First scale A so that ||A - I|| < 1
    const normA = oneNorm(A, n);
    const scale = 1 / normA;

    let X = new Float64Array(n * n);
    matScale(A, scale, X, n);

    const I = identity(n);
    let iterations = 0;

    for (let iter = 0; iter < maxIter; iter++) {
        iterations = iter + 1;

        if (iter % 3 === 0) {
            reportProgress(10 + 70 * iter / maxIter);
        }

        // X_new = (1/2) X (3I - X^2)
        const X2 = new Float64Array(n * n);
        matMul(X, X, X2, n);

        const threeIminusX2 = new Float64Array(n * n);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                threeIminusX2[i * n + j] = (i === j ? 3 : 0) - X2[i * n + j];
            }
        }

        const Xnew = new Float64Array(n * n);
        matMul(X, threeIminusX2, Xnew, n);
        matScale(Xnew, 0.5, Xnew, n);

        // Check convergence
        const diff = new Float64Array(n * n);
        matSub(Xnew, X, diff, n);
        const relError = frobeniusNorm(diff) / frobeniusNorm(X);

        X = Xnew;

        if (relError < tol) {
            break;
        }
    }

    // Unscale: √(A/s) = √A / √s
    const sqrtScale = Math.sqrt(scale);
    matScale(X, 1 / sqrtScale, X, n);

    return { result: X, iterations };
}

function computeNewtonSchulz(A, n) {
    reportProgress(10);

    const inputNorm = oneNorm(A, n);
    const startTime = performance.now();

    const { result, iterations } = newtonSchulz(A, n);

    const execTime = performance.now() - startTime;
    reportProgress(85);

    // Verify
    const sqrtAsq = new Float64Array(n * n);
    matMul(result, result, sqrtAsq, n);
    const diff = new Float64Array(n * n);
    matSub(sqrtAsq, A, diff, n);
    const verificationError = frobeniusNorm(diff) / frobeniusNorm(A);

    const outputNorm = frobeniusNorm(result);

    reportProgress(100);

    const displaySize = Math.min(5, n);
    const submatrix = [];
    for (let i = 0; i < displaySize; i++) {
        const row = [];
        for (let j = 0; j < displaySize; j++) {
            row.push(result[i * n + j]);
        }
        submatrix.push(row);
    }

    return {
        algorithm: 'Newton-Schulz Iteration',
        description: 'X_{k+1} = ½X_k(3I - X_k²) with scaling',
        matrixSize: n,
        inputNorm,
        outputNorm,
        iterations,
        verificationError,
        executionTime: execTime,
        submatrix
    };
}

/**
 * Eigenvalue decomposition method for symmetric matrices
 * √A = V √Λ V^T where A = V Λ V^T
 */
function eigenSqrt(A, n, maxIter = 100) {
    // For symmetric matrices, use Jacobi eigenvalue algorithm
    const V = identity(n);
    const D = new Float64Array(A);

    // Jacobi iterations
    for (let iter = 0; iter < maxIter; iter++) {
        if (iter % 10 === 0) {
            reportProgress(10 + 50 * iter / maxIter);
        }

        // Find largest off-diagonal element
        let maxVal = 0;
        let p = 0, q = 1;

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (Math.abs(D[i * n + j]) > maxVal) {
                    maxVal = Math.abs(D[i * n + j]);
                    p = i;
                    q = j;
                }
            }
        }

        if (maxVal < 1e-14) break;

        // Compute rotation
        const theta = (D[q * n + q] - D[p * n + p]) / (2 * D[p * n + q]);
        const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;

        // Apply rotation to D
        const newD = new Float64Array(D);
        newD[p * n + p] = D[p * n + p] - t * D[p * n + q];
        newD[q * n + q] = D[q * n + q] + t * D[p * n + q];
        newD[p * n + q] = 0;
        newD[q * n + p] = 0;

        for (let i = 0; i < n; i++) {
            if (i !== p && i !== q) {
                newD[i * n + p] = c * D[i * n + p] - s * D[i * n + q];
                newD[p * n + i] = newD[i * n + p];
                newD[i * n + q] = s * D[i * n + p] + c * D[i * n + q];
                newD[q * n + i] = newD[i * n + q];
            }
        }

        matCopy(newD, D);

        // Update V
        for (let i = 0; i < n; i++) {
            const vip = V[i * n + p];
            const viq = V[i * n + q];
            V[i * n + p] = c * vip - s * viq;
            V[i * n + q] = s * vip + c * viq;
        }
    }

    reportProgress(70);

    // Extract eigenvalues and compute √Λ
    const sqrtLambda = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const eigenval = D[i * n + i];
        if (eigenval < -1e-10) {
            throw new Error('Matrix has negative eigenvalues, no real square root');
        }
        sqrtLambda[i] = Math.sqrt(Math.max(0, eigenval));
    }

    reportProgress(80);

    // Compute √A = V √Λ V^T
    const result = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += V[i * n + k] * sqrtLambda[k] * V[j * n + k];
            }
            result[i * n + j] = sum;
        }
    }

    return result;
}

function computeEigenSqrt(A, n) {
    reportProgress(10);

    const inputNorm = oneNorm(A, n);
    const startTime = performance.now();

    const result = eigenSqrt(A, n);

    const execTime = performance.now() - startTime;
    reportProgress(85);

    // Verify
    const sqrtAsq = new Float64Array(n * n);
    matMul(result, result, sqrtAsq, n);
    const diff = new Float64Array(n * n);
    matSub(sqrtAsq, A, diff, n);
    const verificationError = frobeniusNorm(diff) / frobeniusNorm(A);

    const outputNorm = frobeniusNorm(result);

    reportProgress(100);

    const displaySize = Math.min(5, n);
    const submatrix = [];
    for (let i = 0; i < displaySize; i++) {
        const row = [];
        for (let j = 0; j < displaySize; j++) {
            row.push(result[i * n + j]);
        }
        submatrix.push(row);
    }

    return {
        algorithm: 'Eigenvalue Decomposition',
        description: '√A = V √Λ V^T using Jacobi method',
        matrixSize: n,
        inputNorm,
        outputNorm,
        verificationError,
        executionTime: execTime,
        submatrix
    };
}

/**
 * Padé approximation for matrix square root
 * Uses (1 + X)^(1/2) ≈ Padé approximant around X = 0
 */
function padeSqrt(A, n) {
    // Scale A to be near identity
    const normA = oneNorm(A, n);
    const scale = 1 / normA;
    let scaledA = new Float64Array(n * n);
    matScale(A, scale, scaledA, n);

    // X = scaledA - I
    const I = identity(n);
    const X = new Float64Array(n * n);
    matSub(scaledA, I, X, n);

    reportProgress(30);

    // Padé [2/2] approximant for (1+x)^(1/2)
    // (1+x)^(1/2) ≈ (1 + 3x/4 + x²/8) / (1 + x/4)
    // For matrices: (I + 3X/4 + X²/8) (I + X/4)^{-1}

    const X2 = new Float64Array(n * n);
    matMul(X, X, X2, n);

    reportProgress(50);

    // Numerator: I + 3X/4 + X²/8
    const num = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            num[i * n + j] = (i === j ? 1 : 0) + 0.75 * X[i * n + j] + 0.125 * X2[i * n + j];
        }
    }

    reportProgress(60);

    // Denominator: I + X/4
    const den = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            den[i * n + j] = (i === j ? 1 : 0) + 0.25 * X[i * n + j];
        }
    }

    const denInv = matInverse(den, n);

    reportProgress(75);

    // Result = num * denInv
    const scaledResult = new Float64Array(n * n);
    matMul(num, denInv, scaledResult, n);

    // Unscale: √(A/s) * √s = √A
    const result = new Float64Array(n * n);
    matScale(scaledResult, Math.sqrt(1 / scale), result, n);

    return result;
}

function computePadeSqrt(A, n) {
    reportProgress(10);

    const inputNorm = oneNorm(A, n);
    const startTime = performance.now();

    const result = padeSqrt(A, n);

    const execTime = performance.now() - startTime;
    reportProgress(85);

    // Verify
    const sqrtAsq = new Float64Array(n * n);
    matMul(result, result, sqrtAsq, n);
    const diff = new Float64Array(n * n);
    matSub(sqrtAsq, A, diff, n);
    const verificationError = frobeniusNorm(diff) / frobeniusNorm(A);

    const outputNorm = frobeniusNorm(result);

    reportProgress(100);

    const displaySize = Math.min(5, n);
    const submatrix = [];
    for (let i = 0; i < displaySize; i++) {
        const row = [];
        for (let j = 0; j < displaySize; j++) {
            row.push(result[i * n + j]);
        }
        submatrix.push(row);
    }

    return {
        algorithm: 'Padé Approximation',
        description: '[2/2] Padé approximant with scaling',
        matrixSize: n,
        inputNorm,
        outputNorm,
        verificationError,
        executionTime: execTime,
        submatrix
    };
}

function compareAlgorithms(A, n) {
    const inputNorm = oneNorm(A, n);
    const comparison = [];

    // Denman-Beavers
    reportProgress(5);
    let startTime = performance.now();
    const { result: dbResult } = denmanBeavers(A, n);
    let dbTime = performance.now() - startTime;

    let sqrtAsq = new Float64Array(n * n);
    matMul(dbResult, dbResult, sqrtAsq, n);
    let diff = new Float64Array(n * n);
    matSub(sqrtAsq, A, diff, n);
    const dbError = frobeniusNorm(diff) / frobeniusNorm(A);

    comparison.push({
        algorithm: 'Denman-Beavers',
        time: dbTime.toFixed(2),
        norm: frobeniusNorm(dbResult).toFixed(4),
        error: dbError.toExponential(2)
    });

    // Newton-Schulz
    reportProgress(30);
    startTime = performance.now();
    const { result: nsResult } = newtonSchulz(A, n);
    let nsTime = performance.now() - startTime;

    matMul(nsResult, nsResult, sqrtAsq, n);
    matSub(sqrtAsq, A, diff, n);
    const nsError = frobeniusNorm(diff) / frobeniusNorm(A);

    comparison.push({
        algorithm: 'Newton-Schulz',
        time: nsTime.toFixed(2),
        norm: frobeniusNorm(nsResult).toFixed(4),
        error: nsError.toExponential(2)
    });

    // Eigendecomposition
    reportProgress(55);
    startTime = performance.now();
    let eigenResult;
    let eigenError;
    try {
        eigenResult = eigenSqrt(A, n);
        matMul(eigenResult, eigenResult, sqrtAsq, n);
        matSub(sqrtAsq, A, diff, n);
        eigenError = frobeniusNorm(diff) / frobeniusNorm(A);
    } catch (e) {
        eigenResult = null;
        eigenError = 'N/A';
    }
    let eigenTime = performance.now() - startTime;

    comparison.push({
        algorithm: 'Eigendecomposition',
        time: eigenTime.toFixed(2),
        norm: eigenResult ? frobeniusNorm(eigenResult).toFixed(4) : 'N/A',
        error: typeof eigenError === 'number' ? eigenError.toExponential(2) : eigenError
    });

    // Padé
    reportProgress(80);
    startTime = performance.now();
    const padeResult = padeSqrt(A, n);
    let padeTime = performance.now() - startTime;

    matMul(padeResult, padeResult, sqrtAsq, n);
    matSub(sqrtAsq, A, diff, n);
    const padeError = frobeniusNorm(diff) / frobeniusNorm(A);

    comparison.push({
        algorithm: 'Padé Approximation',
        time: padeTime.toFixed(2),
        norm: frobeniusNorm(padeResult).toFixed(4),
        error: padeError.toExponential(2)
    });

    reportProgress(100);

    // Use Denman-Beavers result for display
    const displaySize = Math.min(5, n);
    const submatrix = [];
    for (let i = 0; i < displaySize; i++) {
        const row = [];
        for (let j = 0; j < displaySize; j++) {
            row.push(dbResult[i * n + j]);
        }
        submatrix.push(row);
    }

    return {
        algorithm: 'Algorithm Comparison',
        description: 'Comparing all matrix square root methods',
        matrixSize: n,
        inputNorm,
        outputNorm: frobeniusNorm(dbResult),
        verificationError: dbError,
        comparison,
        submatrix
    };
}
