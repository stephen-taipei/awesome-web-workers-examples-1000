/**
 * Web Worker for Condition Number computation
 * Computes κ(A) = ||A|| × ||A⁻¹|| for various norms
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
            case '2':
                result = computeCondition2(A, n);
                break;
            case '1':
                result = computeCondition1(A, n);
                break;
            case 'inf':
                result = computeConditionInf(A, n);
                break;
            case 'fro':
                result = computeConditionFro(A, n);
                break;
            case 'compare':
                result = compareNorms(A, n);
                break;
            default:
                throw new Error('Unknown norm type: ' + type);
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
        case 'random':
            for (let i = 0; i < n * n; i++) {
                A[i] = Math.random() * 2 - 1;
            }
            break;

        case 'wellConditioned':
            // Diagonal dominant matrix
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j) {
                        A[i * n + j] = n + Math.random();
                    } else {
                        A[i * n + j] = Math.random() * 0.1;
                    }
                }
            }
            break;

        case 'illConditioned':
            // Matrix with varying diagonal values
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j) {
                        A[i * n + j] = Math.pow(10, -i * 10 / n);
                    } else {
                        A[i * n + j] = 0.01 * Math.random();
                    }
                }
            }
            break;

        case 'hilbert':
            // Hilbert matrix: H_ij = 1 / (i + j + 1)
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    A[i * n + j] = 1 / (i + j + 1);
                }
            }
            break;

        case 'vandermonde':
            // Vandermonde matrix
            const points = [];
            for (let i = 0; i < n; i++) {
                points.push((i + 1) / n);
            }
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    A[i * n + j] = Math.pow(points[i], j);
                }
            }
            break;

        default:
            throw new Error('Unknown matrix type');
    }

    return A;
}

// Norm computations
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

function infNorm(A, n) {
    let maxSum = 0;
    for (let i = 0; i < n; i++) {
        let rowSum = 0;
        for (let j = 0; j < n; j++) {
            rowSum += Math.abs(A[i * n + j]);
        }
        maxSum = Math.max(maxSum, rowSum);
    }
    return maxSum;
}

function frobeniusNorm(A) {
    let sum = 0;
    for (let i = 0; i < A.length; i++) {
        sum += A[i] * A[i];
    }
    return Math.sqrt(sum);
}

// Matrix inverse using LU decomposition with partial pivoting
function matInverse(A, n) {
    // Create augmented matrix [A | I]
    const aug = new Float64Array(n * 2 * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            aug[i * 2 * n + j] = A[i * n + j];
        }
        aug[i * 2 * n + n + i] = 1;
    }

    // Gauss-Jordan elimination with partial pivoting
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
            throw new Error('Matrix is singular or nearly singular');
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

// Singular values via power iteration for 2-norm
function singularValues(A, n, numValues = 2) {
    // Compute A^T * A
    const AtA = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += A[k * n + i] * A[k * n + j];
            }
            AtA[i * n + j] = sum;
        }
    }

    const sigmas = [];
    const B = new Float64Array(AtA);

    for (let s = 0; s < numValues; s++) {
        // Power iteration for largest eigenvalue
        let v = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            v[i] = Math.random();
        }

        // Normalize
        let norm = 0;
        for (let i = 0; i < n; i++) norm += v[i] * v[i];
        norm = Math.sqrt(norm);
        for (let i = 0; i < n; i++) v[i] /= norm;

        let lambda = 0;

        for (let iter = 0; iter < 100; iter++) {
            // w = B * v
            const w = new Float64Array(n);
            for (let i = 0; i < n; i++) {
                let sum = 0;
                for (let j = 0; j < n; j++) {
                    sum += B[i * n + j] * v[j];
                }
                w[i] = sum;
            }

            // Rayleigh quotient
            let wv = 0, vv = 0;
            for (let i = 0; i < n; i++) {
                wv += w[i] * v[i];
                vv += v[i] * v[i];
            }
            const newLambda = wv / vv;

            // Normalize w
            norm = 0;
            for (let i = 0; i < n; i++) norm += w[i] * w[i];
            norm = Math.sqrt(norm);

            if (norm < 1e-14) break;

            for (let i = 0; i < n; i++) v[i] = w[i] / norm;

            if (Math.abs(newLambda - lambda) < 1e-12 * Math.abs(newLambda)) {
                break;
            }
            lambda = newLambda;
        }

        sigmas.push(Math.sqrt(Math.max(0, lambda)));

        // Deflate: B = B - lambda * v * v^T
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                B[i * n + j] -= lambda * v[i] * v[j];
            }
        }
    }

    return sigmas;
}

// Get smallest singular value via inverse iteration
function smallestSingularValue(A, n) {
    try {
        const Ainv = matInverse(A, n);
        const sigmasInv = singularValues(Ainv, n, 1);
        return 1 / sigmasInv[0];
    } catch (e) {
        return 0; // Singular matrix
    }
}

function computeCondition2(A, n) {
    reportProgress(10);

    const startTime = performance.now();

    // Get largest singular value
    reportProgress(30);
    const sigmas = singularValues(A, n, 1);
    const sigmaMax = sigmas[0];

    // Get smallest singular value
    reportProgress(60);
    const sigmaMin = smallestSingularValue(A, n);

    const execTime = performance.now() - startTime;
    reportProgress(90);

    const norm2 = sigmaMax;
    const conditionNumber = sigmaMin > 0 ? sigmaMax / sigmaMin : Infinity;

    reportProgress(100);

    // Extract submatrix for display
    const displaySize = Math.min(5, n);
    const submatrix = [];
    for (let i = 0; i < displaySize; i++) {
        const row = [];
        for (let j = 0; j < displaySize; j++) {
            row.push(A[i * n + j]);
        }
        submatrix.push(row);
    }

    return {
        algorithm: '2-norm (Spectral)',
        description: 'κ₂(A) = σ_max / σ_min',
        matrixSize: n,
        norm: norm2,
        normInverse: sigmaMin > 0 ? 1 / sigmaMin : Infinity,
        conditionNumber,
        log10Cond: Math.log10(conditionNumber),
        sigmaMax,
        sigmaMin,
        executionTime: execTime,
        submatrix
    };
}

function computeCondition1(A, n) {
    reportProgress(10);

    const startTime = performance.now();

    const norm1 = oneNorm(A, n);
    reportProgress(30);

    let normInv1, conditionNumber;
    try {
        const Ainv = matInverse(A, n);
        reportProgress(70);
        normInv1 = oneNorm(Ainv, n);
        conditionNumber = norm1 * normInv1;
    } catch (e) {
        normInv1 = Infinity;
        conditionNumber = Infinity;
    }

    const execTime = performance.now() - startTime;
    reportProgress(100);

    const displaySize = Math.min(5, n);
    const submatrix = [];
    for (let i = 0; i < displaySize; i++) {
        const row = [];
        for (let j = 0; j < displaySize; j++) {
            row.push(A[i * n + j]);
        }
        submatrix.push(row);
    }

    return {
        algorithm: '1-norm (Column Sum)',
        description: 'κ₁(A) = ||A||₁ × ||A⁻¹||₁',
        matrixSize: n,
        norm: norm1,
        normInverse: normInv1,
        conditionNumber,
        log10Cond: Math.log10(conditionNumber),
        executionTime: execTime,
        submatrix
    };
}

function computeConditionInf(A, n) {
    reportProgress(10);

    const startTime = performance.now();

    const normInf = infNorm(A, n);
    reportProgress(30);

    let normInvInf, conditionNumber;
    try {
        const Ainv = matInverse(A, n);
        reportProgress(70);
        normInvInf = infNorm(Ainv, n);
        conditionNumber = normInf * normInvInf;
    } catch (e) {
        normInvInf = Infinity;
        conditionNumber = Infinity;
    }

    const execTime = performance.now() - startTime;
    reportProgress(100);

    const displaySize = Math.min(5, n);
    const submatrix = [];
    for (let i = 0; i < displaySize; i++) {
        const row = [];
        for (let j = 0; j < displaySize; j++) {
            row.push(A[i * n + j]);
        }
        submatrix.push(row);
    }

    return {
        algorithm: '∞-norm (Row Sum)',
        description: 'κ_∞(A) = ||A||_∞ × ||A⁻¹||_∞',
        matrixSize: n,
        norm: normInf,
        normInverse: normInvInf,
        conditionNumber,
        log10Cond: Math.log10(conditionNumber),
        executionTime: execTime,
        submatrix
    };
}

function computeConditionFro(A, n) {
    reportProgress(10);

    const startTime = performance.now();

    const normF = frobeniusNorm(A);
    reportProgress(30);

    let normInvF, conditionNumber;
    try {
        const Ainv = matInverse(A, n);
        reportProgress(70);
        normInvF = frobeniusNorm(Ainv);
        conditionNumber = normF * normInvF;
    } catch (e) {
        normInvF = Infinity;
        conditionNumber = Infinity;
    }

    const execTime = performance.now() - startTime;
    reportProgress(100);

    const displaySize = Math.min(5, n);
    const submatrix = [];
    for (let i = 0; i < displaySize; i++) {
        const row = [];
        for (let j = 0; j < displaySize; j++) {
            row.push(A[i * n + j]);
        }
        submatrix.push(row);
    }

    return {
        algorithm: 'Frobenius Norm',
        description: 'κ_F(A) = ||A||_F × ||A⁻¹||_F',
        matrixSize: n,
        norm: normF,
        normInverse: normInvF,
        conditionNumber,
        log10Cond: Math.log10(conditionNumber),
        executionTime: execTime,
        submatrix
    };
}

function compareNorms(A, n) {
    const comparison = [];

    // 2-norm
    reportProgress(5);
    let startTime = performance.now();
    const sigmas = singularValues(A, n, 1);
    const sigmaMax = sigmas[0];
    const sigmaMin = smallestSingularValue(A, n);
    const cond2 = sigmaMin > 0 ? sigmaMax / sigmaMin : Infinity;
    comparison.push({
        norm: '2-norm',
        normA: sigmaMax.toExponential(3),
        normAinv: (sigmaMin > 0 ? 1 / sigmaMin : Infinity).toExponential(3),
        condition: cond2.toExponential(3),
        log10: Math.log10(cond2).toFixed(2)
    });

    // 1-norm
    reportProgress(30);
    const norm1 = oneNorm(A, n);
    let Ainv;
    try {
        Ainv = matInverse(A, n);
    } catch (e) {
        Ainv = null;
    }
    const normInv1 = Ainv ? oneNorm(Ainv, n) : Infinity;
    const cond1 = norm1 * normInv1;
    comparison.push({
        norm: '1-norm',
        normA: norm1.toExponential(3),
        normAinv: normInv1.toExponential(3),
        condition: cond1.toExponential(3),
        log10: Math.log10(cond1).toFixed(2)
    });

    // ∞-norm
    reportProgress(55);
    const normInf = infNorm(A, n);
    const normInvInf = Ainv ? infNorm(Ainv, n) : Infinity;
    const condInf = normInf * normInvInf;
    comparison.push({
        norm: '∞-norm',
        normA: normInf.toExponential(3),
        normAinv: normInvInf.toExponential(3),
        condition: condInf.toExponential(3),
        log10: Math.log10(condInf).toFixed(2)
    });

    // Frobenius norm
    reportProgress(80);
    const normF = frobeniusNorm(A);
    const normInvF = Ainv ? frobeniusNorm(Ainv) : Infinity;
    const condF = normF * normInvF;
    comparison.push({
        norm: 'Frobenius',
        normA: normF.toExponential(3),
        normAinv: normInvF.toExponential(3),
        condition: condF.toExponential(3),
        log10: Math.log10(condF).toFixed(2)
    });

    reportProgress(100);

    const displaySize = Math.min(5, n);
    const submatrix = [];
    for (let i = 0; i < displaySize; i++) {
        const row = [];
        for (let j = 0; j < displaySize; j++) {
            row.push(A[i * n + j]);
        }
        submatrix.push(row);
    }

    // Determine conditioning category
    let category, categoryClass;
    if (cond2 < 10) {
        category = 'Well-conditioned';
        categoryClass = 'good';
    } else if (cond2 < 1e6) {
        category = 'Moderately conditioned';
        categoryClass = 'moderate';
    } else if (cond2 < 1e12) {
        category = 'Ill-conditioned';
        categoryClass = 'poor';
    } else {
        category = 'Very ill-conditioned / Singular';
        categoryClass = 'severe';
    }

    return {
        algorithm: 'Norm Comparison',
        description: 'Comparing condition numbers across all norms',
        matrixSize: n,
        conditionNumber: cond2,
        log10Cond: Math.log10(cond2),
        category,
        categoryClass,
        comparison,
        submatrix
    };
}
