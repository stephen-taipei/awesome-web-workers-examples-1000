/**
 * Web Worker for Matrix Norms computation
 * Computes various matrix norms: Frobenius, p-norms, induced norms
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

        let result;

        switch (type) {
            case 'all':
                result = computeAllNorms(A, m, n);
                break;
            case 'frobenius':
                result = computeFrobeniusNorm(A, m, n);
                break;
            case 'one':
                result = computeOneNorm(A, m, n);
                break;
            case 'inf':
                result = computeInfNorm(A, m, n);
                break;
            case 'two':
                result = computeTwoNorm(A, m, n);
                break;
            case 'nuclear':
                result = computeNuclearNorm(A, m, n);
                break;
            case 'max':
                result = computeMaxNorm(A, m, n);
                break;
            case 'pNorm':
                result = computeEntryPNorm(A, m, n, data.p || 2);
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

// Matrix generation
function generateMatrix(m, n, matrixType) {
    const A = new Float64Array(m * n);

    switch (matrixType) {
        case 'random':
            for (let i = 0; i < m * n; i++) {
                A[i] = Math.random() * 2 - 1;
            }
            break;

        case 'sparse':
            const density = 0.1;
            for (let i = 0; i < m * n; i++) {
                if (Math.random() < density) {
                    A[i] = Math.random() * 2 - 1;
                }
            }
            break;

        case 'lowRank':
            const rank = Math.min(5, Math.min(m, n));
            const U = new Float64Array(m * rank);
            const V = new Float64Array(rank * n);
            for (let i = 0; i < m * rank; i++) U[i] = Math.random() - 0.5;
            for (let i = 0; i < rank * n; i++) V[i] = Math.random() - 0.5;
            // A = U * V
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    let sum = 0;
                    for (let k = 0; k < rank; k++) {
                        sum += U[i * rank + k] * V[k * n + j];
                    }
                    A[i * n + j] = sum;
                }
            }
            break;

        case 'orthogonal':
            if (m !== n) {
                // For non-square, generate random
                for (let i = 0; i < m * n; i++) {
                    A[i] = Math.random() * 2 - 1;
                }
            } else {
                // Generate orthogonal via QR of random matrix
                const Q = generateOrthogonal(n);
                for (let i = 0; i < n * n; i++) {
                    A[i] = Q[i];
                }
            }
            break;

        default:
            for (let i = 0; i < m * n; i++) {
                A[i] = Math.random() * 2 - 1;
            }
    }

    return A;
}

function generateOrthogonal(n) {
    // Gram-Schmidt on random matrix
    const Q = new Float64Array(n * n);
    const R = new Float64Array(n * n);

    // Start with random matrix
    for (let i = 0; i < n * n; i++) {
        Q[i] = Math.random() - 0.5;
    }

    // Modified Gram-Schmidt
    for (let j = 0; j < n; j++) {
        // Normalize column j
        let norm = 0;
        for (let i = 0; i < n; i++) {
            norm += Q[i * n + j] * Q[i * n + j];
        }
        norm = Math.sqrt(norm);
        if (norm > 1e-10) {
            for (let i = 0; i < n; i++) {
                Q[i * n + j] /= norm;
            }
        }

        // Orthogonalize remaining columns
        for (let k = j + 1; k < n; k++) {
            let dot = 0;
            for (let i = 0; i < n; i++) {
                dot += Q[i * n + j] * Q[i * n + k];
            }
            for (let i = 0; i < n; i++) {
                Q[i * n + k] -= dot * Q[i * n + j];
            }
        }
    }

    return Q;
}

// Frobenius Norm: ||A||_F = sqrt(sum of squares)
function frobeniusNorm(A) {
    let sum = 0;
    for (let i = 0; i < A.length; i++) {
        sum += A[i] * A[i];
    }
    return Math.sqrt(sum);
}

// 1-Norm: max column sum
function oneNorm(A, m, n) {
    let maxSum = 0;
    for (let j = 0; j < n; j++) {
        let colSum = 0;
        for (let i = 0; i < m; i++) {
            colSum += Math.abs(A[i * n + j]);
        }
        maxSum = Math.max(maxSum, colSum);
    }
    return maxSum;
}

// Infinity Norm: max row sum
function infNorm(A, m, n) {
    let maxSum = 0;
    for (let i = 0; i < m; i++) {
        let rowSum = 0;
        for (let j = 0; j < n; j++) {
            rowSum += Math.abs(A[i * n + j]);
        }
        maxSum = Math.max(maxSum, rowSum);
    }
    return maxSum;
}

// Max Norm: max |a_ij|
function maxNorm(A) {
    let maxVal = 0;
    for (let i = 0; i < A.length; i++) {
        maxVal = Math.max(maxVal, Math.abs(A[i]));
    }
    return maxVal;
}

// Entry-wise p-norm: (sum |a_ij|^p)^(1/p)
function entryPNorm(A, p) {
    if (p === Infinity) {
        return maxNorm(A);
    }
    let sum = 0;
    for (let i = 0; i < A.length; i++) {
        sum += Math.pow(Math.abs(A[i]), p);
    }
    return Math.pow(sum, 1 / p);
}

// 2-Norm (spectral): largest singular value via power iteration
function twoNorm(A, m, n) {
    // Compute A^T * A for m >= n, or A * A^T for m < n
    const useATA = m >= n;
    const size = useATA ? n : m;
    const B = new Float64Array(size * size);

    if (useATA) {
        // B = A^T * A
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                let sum = 0;
                for (let k = 0; k < m; k++) {
                    sum += A[k * n + i] * A[k * n + j];
                }
                B[i * n + j] = sum;
            }
        }
    } else {
        // B = A * A^T
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < m; j++) {
                let sum = 0;
                for (let k = 0; k < n; k++) {
                    sum += A[i * n + k] * A[j * n + k];
                }
                B[i * m + j] = sum;
            }
        }
    }

    // Power iteration for largest eigenvalue of B
    let v = new Float64Array(size);
    for (let i = 0; i < size; i++) v[i] = Math.random();

    // Normalize
    let norm = 0;
    for (let i = 0; i < size; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm);
    for (let i = 0; i < size; i++) v[i] /= norm;

    let lambda = 0;
    for (let iter = 0; iter < 100; iter++) {
        // w = B * v
        const w = new Float64Array(size);
        for (let i = 0; i < size; i++) {
            let sum = 0;
            for (let j = 0; j < size; j++) {
                sum += B[i * size + j] * v[j];
            }
            w[i] = sum;
        }

        // Rayleigh quotient
        let wv = 0, vv = 0;
        for (let i = 0; i < size; i++) {
            wv += w[i] * v[i];
            vv += v[i] * v[i];
        }
        const newLambda = wv / vv;

        // Normalize
        norm = 0;
        for (let i = 0; i < size; i++) norm += w[i] * w[i];
        norm = Math.sqrt(norm);
        if (norm < 1e-14) break;
        for (let i = 0; i < size; i++) v[i] = w[i] / norm;

        if (Math.abs(newLambda - lambda) < 1e-12 * Math.abs(newLambda)) break;
        lambda = newLambda;
    }

    return Math.sqrt(Math.max(0, lambda));
}

// Singular values via power iteration with deflation
function singularValues(A, m, n, numValues) {
    const sigmas = [];
    const B = new Float64Array(A);
    const minDim = Math.min(m, n);
    const count = Math.min(numValues, minDim);

    for (let s = 0; s < count; s++) {
        // Power iteration on B^T * B (or B * B^T)
        const useATA = m >= n;
        const size = useATA ? n : m;
        const C = new Float64Array(size * size);

        if (useATA) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    let sum = 0;
                    for (let k = 0; k < m; k++) {
                        sum += B[k * n + i] * B[k * n + j];
                    }
                    C[i * n + j] = sum;
                }
            }
        } else {
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < m; j++) {
                    let sum = 0;
                    for (let k = 0; k < n; k++) {
                        sum += B[i * n + k] * B[j * n + k];
                    }
                    C[i * m + j] = sum;
                }
            }
        }

        // Power iteration
        let v = new Float64Array(size);
        for (let i = 0; i < size; i++) v[i] = Math.random();
        let norm = 0;
        for (let i = 0; i < size; i++) norm += v[i] * v[i];
        norm = Math.sqrt(norm);
        for (let i = 0; i < size; i++) v[i] /= norm;

        let lambda = 0;
        for (let iter = 0; iter < 100; iter++) {
            const w = new Float64Array(size);
            for (let i = 0; i < size; i++) {
                let sum = 0;
                for (let j = 0; j < size; j++) {
                    sum += C[i * size + j] * v[j];
                }
                w[i] = sum;
            }

            let wv = 0, vv = 0;
            for (let i = 0; i < size; i++) {
                wv += w[i] * v[i];
                vv += v[i] * v[i];
            }
            const newLambda = wv / vv;

            norm = 0;
            for (let i = 0; i < size; i++) norm += w[i] * w[i];
            norm = Math.sqrt(norm);
            if (norm < 1e-14) break;
            for (let i = 0; i < size; i++) v[i] = w[i] / norm;

            if (Math.abs(newLambda - lambda) < 1e-12 * Math.abs(newLambda)) break;
            lambda = newLambda;
        }

        const sigma = Math.sqrt(Math.max(0, lambda));
        sigmas.push(sigma);

        if (sigma < 1e-10) break;

        // Deflate: compute u = Av / sigma, then B = B - sigma * u * v^T
        if (useATA) {
            // u = A * v / sigma
            const u = new Float64Array(m);
            for (let i = 0; i < m; i++) {
                let sum = 0;
                for (let j = 0; j < n; j++) {
                    sum += B[i * n + j] * v[j];
                }
                u[i] = sum / sigma;
            }
            // B = B - sigma * u * v^T
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    B[i * n + j] -= sigma * u[i] * v[j];
                }
            }
        } else {
            // v_right = A^T * v / sigma
            const vRight = new Float64Array(n);
            for (let j = 0; j < n; j++) {
                let sum = 0;
                for (let i = 0; i < m; i++) {
                    sum += B[i * n + j] * v[i];
                }
                vRight[j] = sum / sigma;
            }
            // B = B - sigma * v * vRight^T
            for (let i = 0; i < m; i++) {
                for (let j = 0; j < n; j++) {
                    B[i * n + j] -= sigma * v[i] * vRight[j];
                }
            }
        }
    }

    return sigmas;
}

// Nuclear Norm: sum of singular values
function nuclearNorm(A, m, n) {
    const minDim = Math.min(m, n);
    const sigmas = singularValues(A, m, n, minDim);
    let sum = 0;
    for (const sigma of sigmas) {
        sum += sigma;
    }
    return sum;
}

function computeFrobeniusNorm(A, m, n) {
    reportProgress(50);
    const norm = frobeniusNorm(A);
    reportProgress(100);

    return {
        algorithm: 'Frobenius Norm',
        description: '||A||_F = √(Σᵢⱼ |aᵢⱼ|²)',
        matrixSize: `${m}×${n}`,
        norm,
        submatrix: getSubmatrix(A, m, n)
    };
}

function computeOneNorm(A, m, n) {
    reportProgress(50);
    const norm = oneNorm(A, m, n);
    reportProgress(100);

    return {
        algorithm: '1-Norm (Induced)',
        description: '||A||₁ = max_j Σᵢ |aᵢⱼ| (max column sum)',
        matrixSize: `${m}×${n}`,
        norm,
        submatrix: getSubmatrix(A, m, n)
    };
}

function computeInfNorm(A, m, n) {
    reportProgress(50);
    const norm = infNorm(A, m, n);
    reportProgress(100);

    return {
        algorithm: '∞-Norm (Induced)',
        description: '||A||_∞ = max_i Σⱼ |aᵢⱼ| (max row sum)',
        matrixSize: `${m}×${n}`,
        norm,
        submatrix: getSubmatrix(A, m, n)
    };
}

function computeTwoNorm(A, m, n) {
    reportProgress(20);
    const norm = twoNorm(A, m, n);
    reportProgress(100);

    return {
        algorithm: '2-Norm (Spectral)',
        description: '||A||₂ = σ_max(A) (largest singular value)',
        matrixSize: `${m}×${n}`,
        norm,
        submatrix: getSubmatrix(A, m, n)
    };
}

function computeNuclearNorm(A, m, n) {
    reportProgress(10);
    const norm = nuclearNorm(A, m, n);
    reportProgress(100);

    return {
        algorithm: 'Nuclear Norm (Trace Norm)',
        description: '||A||_* = Σᵢ σᵢ(A) (sum of singular values)',
        matrixSize: `${m}×${n}`,
        norm,
        submatrix: getSubmatrix(A, m, n)
    };
}

function computeMaxNorm(A, m, n) {
    reportProgress(50);
    const norm = maxNorm(A);
    reportProgress(100);

    return {
        algorithm: 'Max Norm',
        description: '||A||_max = max_ij |aᵢⱼ|',
        matrixSize: `${m}×${n}`,
        norm,
        submatrix: getSubmatrix(A, m, n)
    };
}

function computeEntryPNorm(A, m, n, p) {
    reportProgress(50);
    const norm = entryPNorm(A, p);
    reportProgress(100);

    return {
        algorithm: `Entry-wise ${p}-Norm`,
        description: `||A||_p = (Σᵢⱼ |aᵢⱼ|^${p})^(1/${p})`,
        matrixSize: `${m}×${n}`,
        norm,
        pValue: p,
        submatrix: getSubmatrix(A, m, n)
    };
}

function computeAllNorms(A, m, n) {
    const norms = [];

    reportProgress(5);
    norms.push({ name: 'Frobenius ||A||_F', value: frobeniusNorm(A) });

    reportProgress(15);
    norms.push({ name: '1-Norm ||A||₁', value: oneNorm(A, m, n) });

    reportProgress(25);
    norms.push({ name: '∞-Norm ||A||_∞', value: infNorm(A, m, n) });

    reportProgress(35);
    norms.push({ name: 'Max ||A||_max', value: maxNorm(A) });

    reportProgress(45);
    norms.push({ name: '2-Norm ||A||₂', value: twoNorm(A, m, n) });

    reportProgress(70);
    // Only compute nuclear norm for smaller matrices
    if (m * n <= 100000) {
        norms.push({ name: 'Nuclear ||A||_*', value: nuclearNorm(A, m, n) });
    } else {
        norms.push({ name: 'Nuclear ||A||_*', value: '(skipped - matrix too large)' });
    }

    reportProgress(85);
    norms.push({ name: 'Entry-wise L1', value: entryPNorm(A, 1) });
    norms.push({ name: 'Entry-wise L2', value: entryPNorm(A, 2) });

    reportProgress(100);

    // Compute relationships
    const frob = norms[0].value;
    const two = norms[4].value;
    const one = norms[1].value;
    const inf = norms[2].value;

    const relationships = [];
    if (typeof frob === 'number' && typeof two === 'number') {
        relationships.push({
            relation: '||A||₂ ≤ ||A||_F',
            holds: two <= frob + 1e-10,
            values: `${two.toFixed(4)} ≤ ${frob.toFixed(4)}`
        });
        relationships.push({
            relation: '||A||₂ ≤ √(||A||₁ ||A||_∞)',
            holds: two <= Math.sqrt(one * inf) + 1e-10,
            values: `${two.toFixed(4)} ≤ ${Math.sqrt(one * inf).toFixed(4)}`
        });
    }

    return {
        algorithm: 'All Matrix Norms',
        description: 'Comprehensive norm comparison',
        matrixSize: `${m}×${n}`,
        norms,
        relationships,
        submatrix: getSubmatrix(A, m, n)
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
