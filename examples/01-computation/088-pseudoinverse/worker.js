/**
 * Web Worker for Moore-Penrose Pseudoinverse computation
 * Computes A⁺ using SVD, QR, and Normal Equations methods
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let A, m, n;

        if (data.generate) {
            m = data.rows;
            n = data.cols;
            A = generateMatrix(m, n, data.matrixType);
        } else {
            A = new Float64Array(data.A);
            m = data.m;
            n = data.n;
        }

        const tolerance = data.tolerance || 1e-10;
        let result;

        switch (type) {
            case 'svd':
                result = computePseudoinverseSVD(A, m, n, tolerance);
                break;
            case 'qr':
                result = computePseudoinverseQR(A, m, n, tolerance);
                break;
            case 'normalEq':
                result = computePseudoinverseNormal(A, m, n, tolerance);
                break;
            case 'compare':
                result = compareMethods(A, m, n, tolerance);
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

// Matrix generation
function generateMatrix(m, n, matrixType) {
    const A = new Float64Array(m * n);

    switch (matrixType) {
        case 'random':
            for (let i = 0; i < m * n; i++) {
                A[i] = Math.random() * 2 - 1;
            }
            break;

        case 'rankDeficient':
            // Create rank-deficient matrix by making some rows linear combinations
            const rank = Math.floor(Math.min(m, n) / 2);
            const base = new Float64Array(rank * n);
            for (let i = 0; i < rank * n; i++) {
                base[i] = Math.random() * 2 - 1;
            }
            for (let i = 0; i < m; i++) {
                const baseRow = i % rank;
                const scale = 0.5 + Math.random();
                for (let j = 0; j < n; j++) {
                    A[i * n + j] = scale * base[baseRow * n + j];
                }
            }
            break;

        case 'overdetermined':
            // Tall matrix (m > n)
            for (let i = 0; i < m * n; i++) {
                A[i] = Math.random() * 2 - 1;
            }
            break;

        case 'underdetermined':
            // Wide matrix (m < n) - swap dimensions in generation
            for (let i = 0; i < m * n; i++) {
                A[i] = Math.random() * 2 - 1;
            }
            break;

        default:
            for (let i = 0; i < m * n; i++) {
                A[i] = Math.random() * 2 - 1;
            }
    }

    return A;
}

// Matrix utilities
function transpose(A, m, n) {
    const At = new Float64Array(n * m);
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            At[j * m + i] = A[i * n + j];
        }
    }
    return At;
}

function matMul(A, B, m, k, n) {
    const C = new Float64Array(m * n);
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let l = 0; l < k; l++) {
                sum += A[i * k + l] * B[l * n + j];
            }
            C[i * n + j] = sum;
        }
    }
    return C;
}

function frobeniusNorm(A) {
    let sum = 0;
    for (let i = 0; i < A.length; i++) {
        sum += A[i] * A[i];
    }
    return Math.sqrt(sum);
}

// Matrix inverse using Gauss-Jordan
function matInverse(A, n) {
    const aug = new Float64Array(n * 2 * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            aug[i * 2 * n + j] = A[i * n + j];
        }
        aug[i * 2 * n + n + i] = 1;
    }

    for (let i = 0; i < n; i++) {
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

        if (maxRow !== i) {
            for (let j = 0; j < 2 * n; j++) {
                const temp = aug[i * 2 * n + j];
                aug[i * 2 * n + j] = aug[maxRow * 2 * n + j];
                aug[maxRow * 2 * n + j] = temp;
            }
        }

        const pivot = aug[i * 2 * n + i];
        for (let j = 0; j < 2 * n; j++) {
            aug[i * 2 * n + j] /= pivot;
        }

        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = aug[k * 2 * n + i];
                for (let j = 0; j < 2 * n; j++) {
                    aug[k * 2 * n + j] -= factor * aug[i * 2 * n + j];
                }
            }
        }
    }

    const inv = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            inv[i * n + j] = aug[i * 2 * n + n + j];
        }
    }
    return inv;
}

/**
 * SVD-based pseudoinverse (most robust)
 * A = UΣV^T => A⁺ = VΣ⁺U^T
 */
function svdPseudoinverse(A, m, n, tol) {
    // Compute SVD using one-sided Jacobi
    const minDim = Math.min(m, n);
    const maxDim = Math.max(m, n);

    // Initialize V = I, copy A
    const V = new Float64Array(n * n);
    for (let i = 0; i < n; i++) V[i * n + i] = 1;

    const B = new Float64Array(A);

    // Jacobi iterations on B^T * B
    const maxIter = 30;
    for (let sweep = 0; sweep < maxIter; sweep++) {
        reportProgress(10 + 40 * sweep / maxIter);

        let converged = true;
        for (let i = 0; i < n - 1; i++) {
            for (let j = i + 1; j < n; j++) {
                // Compute dot products
                let bii = 0, bjj = 0, bij = 0;
                for (let k = 0; k < m; k++) {
                    bii += B[k * n + i] * B[k * n + i];
                    bjj += B[k * n + j] * B[k * n + j];
                    bij += B[k * n + i] * B[k * n + j];
                }

                if (Math.abs(bij) < 1e-14 * Math.sqrt(bii * bjj)) continue;
                converged = false;

                // Compute Jacobi rotation
                const tau = (bjj - bii) / (2 * bij);
                const t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
                const c = 1 / Math.sqrt(1 + t * t);
                const s = t * c;

                // Apply rotation to B
                for (let k = 0; k < m; k++) {
                    const bki = B[k * n + i];
                    const bkj = B[k * n + j];
                    B[k * n + i] = c * bki - s * bkj;
                    B[k * n + j] = s * bki + c * bkj;
                }

                // Apply rotation to V
                for (let k = 0; k < n; k++) {
                    const vki = V[k * n + i];
                    const vkj = V[k * n + j];
                    V[k * n + i] = c * vki - s * vkj;
                    V[k * n + j] = s * vki + c * vkj;
                }
            }
        }
        if (converged) break;
    }

    reportProgress(60);

    // Extract singular values and U
    const sigma = new Float64Array(minDim);
    const U = new Float64Array(m * minDim);

    for (let j = 0; j < minDim; j++) {
        let norm = 0;
        for (let i = 0; i < m; i++) {
            norm += B[i * n + j] * B[i * n + j];
        }
        sigma[j] = Math.sqrt(norm);

        if (sigma[j] > tol) {
            for (let i = 0; i < m; i++) {
                U[i * minDim + j] = B[i * n + j] / sigma[j];
            }
        }
    }

    reportProgress(75);

    // Compute pseudoinverse: A⁺ = V Σ⁺ U^T
    // Size of A⁺ is n × m
    const Aplus = new Float64Array(n * m);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            let sum = 0;
            for (let k = 0; k < minDim; k++) {
                if (sigma[k] > tol) {
                    sum += V[i * n + k] * (1 / sigma[k]) * U[j * minDim + k];
                }
            }
            Aplus[i * m + j] = sum;
        }
    }

    // Count effective rank
    let rank = 0;
    for (let i = 0; i < minDim; i++) {
        if (sigma[i] > tol) rank++;
    }

    return { Aplus, sigma, rank };
}

function computePseudoinverseSVD(A, m, n, tol) {
    reportProgress(10);

    const startTime = performance.now();
    const { Aplus, sigma, rank } = svdPseudoinverse(A, m, n, tol);
    const execTime = performance.now() - startTime;

    reportProgress(85);

    // Verify: ||AA⁺A - A|| should be small
    const AAplus = matMul(A, Aplus, m, n, m);
    const AAplusA = matMul(AAplus, A, m, m, n);
    const diff = new Float64Array(m * n);
    for (let i = 0; i < m * n; i++) {
        diff[i] = AAplusA[i] - A[i];
    }
    const verificationError = frobeniusNorm(diff) / frobeniusNorm(A);

    reportProgress(100);

    return {
        algorithm: 'SVD Method',
        description: 'A⁺ = VΣ⁺Uᵀ using Jacobi SVD',
        inputSize: `${m}×${n}`,
        outputSize: `${n}×${m}`,
        rank,
        singularValues: sigma.slice(0, Math.min(5, sigma.length)),
        verificationError,
        tolerance: tol,
        executionTime: execTime,
        submatrix: getSubmatrix(Aplus, n, m),
        inputSubmatrix: getSubmatrix(A, m, n)
    };
}

/**
 * QR-based pseudoinverse for full column rank
 * A = QR => A⁺ = R⁻¹Q^T
 */
function qrPseudoinverse(A, m, n, tol) {
    if (m < n) {
        // For wide matrices, work with A^T
        const At = transpose(A, m, n);
        const { Aplus: AtPlus } = qrPseudoinverse(At, n, m, tol);
        return { Aplus: transpose(AtPlus, m, n), rank: Math.min(m, n) };
    }

    // Modified Gram-Schmidt QR decomposition
    const Q = new Float64Array(m * n);
    const R = new Float64Array(n * n);

    // Copy A to Q
    for (let i = 0; i < m * n; i++) {
        Q[i] = A[i];
    }

    let rank = 0;
    for (let j = 0; j < n; j++) {
        reportProgress(10 + 40 * j / n);

        // Compute norm of column j
        let norm = 0;
        for (let i = 0; i < m; i++) {
            norm += Q[i * n + j] * Q[i * n + j];
        }
        norm = Math.sqrt(norm);

        if (norm > tol) {
            rank++;
            R[j * n + j] = norm;
            for (let i = 0; i < m; i++) {
                Q[i * n + j] /= norm;
            }
        } else {
            R[j * n + j] = 0;
        }

        // Orthogonalize remaining columns
        for (let k = j + 1; k < n; k++) {
            let dot = 0;
            for (let i = 0; i < m; i++) {
                dot += Q[i * n + j] * Q[i * n + k];
            }
            R[j * n + k] = dot;
            for (let i = 0; i < m; i++) {
                Q[i * n + k] -= dot * Q[i * n + j];
            }
        }
    }

    reportProgress(60);

    // Compute R⁻¹ (upper triangular)
    const Rinv = new Float64Array(n * n);
    for (let i = n - 1; i >= 0; i--) {
        if (Math.abs(R[i * n + i]) > tol) {
            Rinv[i * n + i] = 1 / R[i * n + i];
            for (let j = i + 1; j < n; j++) {
                let sum = 0;
                for (let k = i + 1; k <= j; k++) {
                    sum += R[i * n + k] * Rinv[k * n + j];
                }
                Rinv[i * n + j] = -sum / R[i * n + i];
            }
        }
    }

    reportProgress(80);

    // A⁺ = R⁻¹ Q^T
    const Qt = transpose(Q, m, n);
    const Aplus = matMul(Rinv, Qt, n, n, m);

    return { Aplus, rank };
}

function computePseudoinverseQR(A, m, n, tol) {
    reportProgress(10);

    const startTime = performance.now();
    const { Aplus, rank } = qrPseudoinverse(A, m, n, tol);
    const execTime = performance.now() - startTime;

    reportProgress(85);

    // Verify
    const AAplus = matMul(A, Aplus, m, n, m);
    const AAplusA = matMul(AAplus, A, m, m, n);
    const diff = new Float64Array(m * n);
    for (let i = 0; i < m * n; i++) {
        diff[i] = AAplusA[i] - A[i];
    }
    const verificationError = frobeniusNorm(diff) / frobeniusNorm(A);

    reportProgress(100);

    return {
        algorithm: 'QR Decomposition',
        description: 'A⁺ = R⁻¹Qᵀ (for full column rank)',
        inputSize: `${m}×${n}`,
        outputSize: `${n}×${m}`,
        rank,
        verificationError,
        tolerance: tol,
        executionTime: execTime,
        submatrix: getSubmatrix(Aplus, n, m),
        inputSubmatrix: getSubmatrix(A, m, n)
    };
}

/**
 * Normal equations method
 * For m >= n: A⁺ = (A^T A)⁻¹ A^T
 * For m < n: A⁺ = A^T (A A^T)⁻¹
 */
function normalPseudoinverse(A, m, n, tol) {
    if (m >= n) {
        // A⁺ = (A^T A)⁻¹ A^T
        const At = transpose(A, m, n);
        const AtA = matMul(At, A, n, m, n);

        reportProgress(40);

        const AtAinv = matInverse(AtA, n);

        reportProgress(70);

        const Aplus = matMul(AtAinv, At, n, n, m);
        return { Aplus, rank: n };
    } else {
        // A⁺ = A^T (A A^T)⁻¹
        const At = transpose(A, m, n);
        const AAt = matMul(A, At, m, n, m);

        reportProgress(40);

        const AAtinv = matInverse(AAt, m);

        reportProgress(70);

        const Aplus = matMul(At, AAtinv, n, m, m);
        return { Aplus, rank: m };
    }
}

function computePseudoinverseNormal(A, m, n, tol) {
    reportProgress(10);

    const startTime = performance.now();
    let result;
    let errorMsg = null;

    try {
        result = normalPseudoinverse(A, m, n, tol);
    } catch (e) {
        errorMsg = e.message;
        // Fall back to SVD
        result = svdPseudoinverse(A, m, n, tol);
    }

    const { Aplus, rank } = result;
    const execTime = performance.now() - startTime;

    reportProgress(85);

    // Verify
    const AAplus = matMul(A, Aplus, m, n, m);
    const AAplusA = matMul(AAplus, A, m, m, n);
    const diff = new Float64Array(m * n);
    for (let i = 0; i < m * n; i++) {
        diff[i] = AAplusA[i] - A[i];
    }
    const verificationError = frobeniusNorm(diff) / frobeniusNorm(A);

    reportProgress(100);

    const desc = m >= n ? 'A⁺ = (AᵀA)⁻¹Aᵀ' : 'A⁺ = Aᵀ(AAᵀ)⁻¹';

    return {
        algorithm: 'Normal Equations',
        description: desc + (errorMsg ? ' (failed, used SVD)' : ''),
        inputSize: `${m}×${n}`,
        outputSize: `${n}×${m}`,
        rank,
        verificationError,
        tolerance: tol,
        executionTime: execTime,
        warning: errorMsg,
        submatrix: getSubmatrix(Aplus, n, m),
        inputSubmatrix: getSubmatrix(A, m, n)
    };
}

function compareMethods(A, m, n, tol) {
    const comparison = [];

    // SVD
    reportProgress(5);
    let startTime = performance.now();
    const { Aplus: svdResult, sigma, rank: svdRank } = svdPseudoinverse(A, m, n, tol);
    let svdTime = performance.now() - startTime;

    let AAplus = matMul(A, svdResult, m, n, m);
    let AAplusA = matMul(AAplus, A, m, m, n);
    let diff = new Float64Array(m * n);
    for (let i = 0; i < m * n; i++) diff[i] = AAplusA[i] - A[i];
    const svdError = frobeniusNorm(diff) / frobeniusNorm(A);

    comparison.push({
        method: 'SVD',
        time: svdTime.toFixed(2),
        rank: svdRank,
        error: svdError.toExponential(2)
    });

    // QR
    reportProgress(40);
    startTime = performance.now();
    const { Aplus: qrResult, rank: qrRank } = qrPseudoinverse(A, m, n, tol);
    let qrTime = performance.now() - startTime;

    AAplus = matMul(A, qrResult, m, n, m);
    AAplusA = matMul(AAplus, A, m, m, n);
    for (let i = 0; i < m * n; i++) diff[i] = AAplusA[i] - A[i];
    const qrError = frobeniusNorm(diff) / frobeniusNorm(A);

    comparison.push({
        method: 'QR',
        time: qrTime.toFixed(2),
        rank: qrRank,
        error: qrError.toExponential(2)
    });

    // Normal Equations
    reportProgress(70);
    startTime = performance.now();
    let normalResult, normalRank, normalError;
    try {
        const nr = normalPseudoinverse(A, m, n, tol);
        normalResult = nr.Aplus;
        normalRank = nr.rank;
        AAplus = matMul(A, normalResult, m, n, m);
        AAplusA = matMul(AAplus, A, m, m, n);
        for (let i = 0; i < m * n; i++) diff[i] = AAplusA[i] - A[i];
        normalError = frobeniusNorm(diff) / frobeniusNorm(A);
    } catch (e) {
        normalResult = null;
        normalRank = 'N/A';
        normalError = 'Failed';
    }
    let normalTime = performance.now() - startTime;

    comparison.push({
        method: 'Normal Eq.',
        time: normalTime.toFixed(2),
        rank: normalRank,
        error: typeof normalError === 'number' ? normalError.toExponential(2) : normalError
    });

    reportProgress(100);

    return {
        algorithm: 'Method Comparison',
        description: 'Comparing pseudoinverse algorithms',
        inputSize: `${m}×${n}`,
        outputSize: `${n}×${m}`,
        rank: svdRank,
        singularValues: sigma.slice(0, Math.min(5, sigma.length)),
        comparison,
        submatrix: getSubmatrix(svdResult, n, m),
        inputSubmatrix: getSubmatrix(A, m, n)
    };
}

function getSubmatrix(A, m, n) {
    const displayRows = Math.min(5, m);
    const displayCols = Math.min(5, n);
    const submatrix = [];
    for (let i = 0; i < displayRows; i++) {
        const row = [];
        for (let j = 0; j < displayCols; j++) {
            row.push(A[i * n + j]);
        }
        submatrix.push(row);
    }
    return submatrix;
}
