/**
 * Symmetric Matrix Operations Worker
 * Implements packed storage and optimized algorithms for symmetric matrices
 */

/**
 * Packed symmetric matrix storage (upper triangle in row-major order)
 * Element (i,j) where i <= j is at index: i*n - i*(i+1)/2 + j
 * For lower: j*n - j*(j+1)/2 + i
 */

/**
 * Create packed symmetric matrix
 */
function createSymmetric(n) {
    const size = n * (n + 1) / 2;
    return {
        data: new Float64Array(size),
        n
    };
}

/**
 * Get index in packed storage (upper triangle)
 */
function packedIndex(i, j, n) {
    if (i > j) [i, j] = [j, i];  // Swap to get upper triangle
    return i * n - (i * (i + 1)) / 2 + j;
}

/**
 * Get element from packed symmetric matrix
 */
function getSymmetric(sym, i, j) {
    return sym.data[packedIndex(i, j, sym.n)];
}

/**
 * Set element in packed symmetric matrix
 */
function setSymmetric(sym, i, j, value) {
    sym.data[packedIndex(i, j, sym.n)] = value;
}

/**
 * Convert full matrix to packed symmetric
 */
function fullToSymmetric(full) {
    const n = full.length;
    const sym = createSymmetric(n);

    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            setSymmetric(sym, i, j, full[i][j]);
        }
    }

    return sym;
}

/**
 * Symmetric matrix-vector multiplication: y = A * x
 */
function symmetricMatVec(sym, x) {
    const n = sym.n;
    const y = new Float64Array(n);

    for (let i = 0; i < n; i++) {
        let sum = 0;

        // Diagonal element
        sum += getSymmetric(sym, i, i) * x[i];

        // Off-diagonal: use symmetry
        for (let j = 0; j < i; j++) {
            const aij = getSymmetric(sym, i, j);
            sum += aij * x[j];
            y[j] += aij * x[i];  // Contribution from lower triangle
        }

        y[i] += sum;

        if (i % 100 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / n) * 100) });
        }
    }

    return y;
}

/**
 * Cholesky decomposition for SPD matrix: A = L * L^T
 * Returns L in packed lower triangular form
 */
function cholesky(sym) {
    const n = sym.n;
    const L = createSymmetric(n);

    for (let j = 0; j < n; j++) {
        let sum = 0;

        // Compute L[j][j]
        for (let k = 0; k < j; k++) {
            const ljk = getSymmetric(L, j, k);
            sum += ljk * ljk;
        }

        const diag = getSymmetric(sym, j, j) - sum;
        if (diag <= 0) {
            throw new Error('Matrix is not positive definite');
        }
        setSymmetric(L, j, j, Math.sqrt(diag));

        // Compute L[i][j] for i > j
        for (let i = j + 1; i < n; i++) {
            sum = 0;
            for (let k = 0; k < j; k++) {
                sum += getSymmetric(L, i, k) * getSymmetric(L, j, k);
            }
            setSymmetric(L, i, j, (getSymmetric(sym, i, j) - sum) / getSymmetric(L, j, j));
        }

        if (j % 50 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((j / n) * 100) });
        }
    }

    return L;
}

/**
 * LDL^T decomposition for symmetric matrix: A = L * D * L^T
 * L is lower triangular with 1s on diagonal, D is diagonal
 */
function ldlt(sym) {
    const n = sym.n;
    const L = createSymmetric(n);
    const D = new Float64Array(n);

    for (let j = 0; j < n; j++) {
        // Compute D[j]
        let sum = 0;
        for (let k = 0; k < j; k++) {
            const ljk = getSymmetric(L, j, k);
            sum += ljk * ljk * D[k];
        }
        D[j] = getSymmetric(sym, j, j) - sum;

        // Set diagonal of L to 1
        setSymmetric(L, j, j, 1);

        if (Math.abs(D[j]) < 1e-15) {
            throw new Error('Zero pivot - matrix may be singular');
        }

        // Compute L[i][j] for i > j
        for (let i = j + 1; i < n; i++) {
            sum = 0;
            for (let k = 0; k < j; k++) {
                sum += getSymmetric(L, i, k) * getSymmetric(L, j, k) * D[k];
            }
            setSymmetric(L, i, j, (getSymmetric(sym, i, j) - sum) / D[j]);
        }

        if (j % 50 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((j / n) * 100) });
        }
    }

    return { L, D };
}

/**
 * Solve symmetric system Ax = b using Cholesky (for SPD)
 */
function solveSymmetric(sym, b) {
    const n = sym.n;
    const L = cholesky(sym);

    // Forward substitution: Ly = b
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        let sum = b[i];
        for (let j = 0; j < i; j++) {
            sum -= getSymmetric(L, i, j) * y[j];
        }
        y[i] = sum / getSymmetric(L, i, i);
    }

    // Back substitution: L^T x = y
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
        let sum = y[i];
        for (let j = i + 1; j < n; j++) {
            sum -= getSymmetric(L, j, i) * x[j];
        }
        x[i] = sum / getSymmetric(L, i, i);
    }

    return x;
}

/**
 * Power iteration for dominant eigenvalue
 */
function powerIteration(sym, maxIter = 1000, tol = 1e-10) {
    const n = sym.n;

    // Initial random vector
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
    let converged = false;

    for (let iter = 0; iter < maxIter; iter++) {
        // w = A * v
        const w = symmetricMatVec(sym, v);

        // Rayleigh quotient: lambda = v^T * w
        let newLambda = 0;
        for (let i = 0; i < n; i++) {
            newLambda += v[i] * w[i];
        }

        // Normalize w
        norm = 0;
        for (let i = 0; i < n; i++) norm += w[i] * w[i];
        norm = Math.sqrt(norm);
        for (let i = 0; i < n; i++) v[i] = w[i] / norm;

        if (Math.abs(newLambda - lambda) < tol) {
            converged = true;
            lambda = newLambda;
            break;
        }

        lambda = newLambda;

        if (iter % 10 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((iter / maxIter) * 100) });
        }
    }

    return { eigenvalue: lambda, eigenvector: v, converged };
}

/**
 * Generate random symmetric matrix
 */
function generateRandomSymmetric(n, type) {
    const sym = createSymmetric(n);

    switch (type) {
        case 'spd':
            // A = B * B^T + diagonal for SPD
            const B = [];
            for (let i = 0; i < n; i++) {
                B[i] = [];
                for (let j = 0; j < n; j++) {
                    B[i][j] = Math.random() * 2 - 1;
                }
            }
            for (let i = 0; i < n; i++) {
                for (let j = i; j < n; j++) {
                    let sum = 0;
                    for (let k = 0; k < n; k++) {
                        sum += B[i][k] * B[j][k];
                    }
                    if (i === j) sum += n;  // Ensure positive definiteness
                    setSymmetric(sym, i, j, sum);
                }

                if (i % 50 === 0) {
                    postMessage({ type: 'progress', percentage: Math.floor((i / n) * 30) });
                }
            }
            break;

        case 'correlation':
            // Correlation matrix: diagonal = 1, off-diagonal in [-1, 1]
            for (let i = 0; i < n; i++) {
                setSymmetric(sym, i, i, 1);
                for (let j = i + 1; j < n; j++) {
                    setSymmetric(sym, i, j, Math.random() * 1.6 - 0.8);
                }
            }
            break;

        case 'symmetric':
        default:
            // General symmetric
            for (let i = 0; i < n; i++) {
                for (let j = i; j < n; j++) {
                    setSymmetric(sym, i, j, Math.random() * 10 - 5);
                }
            }
            break;
    }

    return sym;
}

/**
 * Compute residual ||Ax - b||
 */
function computeResidual(sym, x, b) {
    const Ax = symmetricMatVec(sym, x);
    let norm = 0;
    for (let i = 0; i < b.length; i++) {
        const diff = Ax[i] - b[i];
        norm += diff * diff;
    }
    return Math.sqrt(norm);
}

// Operation handlers
function handleMultiply(data) {
    const { sym } = data;
    const n = sym.n;
    const startTime = performance.now();

    // Generate random vector
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = Math.random();

    const y = symmetricMatVec(sym, x);

    const executionTime = performance.now() - startTime;

    let yNorm = 0;
    for (let i = 0; i < n; i++) yNorm += y[i] * y[i];
    yNorm = Math.sqrt(yNorm);

    return {
        operation: 'Symmetric × Vector',
        description: 'y = Ax using packed storage',
        matrixSize: n,
        packedSize: sym.data.length,
        denseSize: n * n,
        savings: ((1 - sym.data.length / (n * n)) * 100).toFixed(1),
        resultNorm: yNorm,
        resultSample: Array.from(y.slice(0, Math.min(10, y.length))),
        executionTime
    };
}

function handleCholesky(data) {
    const { sym } = data;
    const startTime = performance.now();

    const L = cholesky(sym);

    const executionTime = performance.now() - startTime;

    // Extract some diagonal elements
    const diagL = [];
    for (let i = 0; i < Math.min(10, sym.n); i++) {
        diagL.push(getSymmetric(L, i, i));
    }

    return {
        operation: 'Cholesky Decomposition',
        description: 'A = LL^T for SPD matrix',
        matrixSize: sym.n,
        diagSample: diagL,
        executionTime
    };
}

function handleLDLT(data) {
    const { sym } = data;
    const startTime = performance.now();

    const { L, D } = ldlt(sym);

    const executionTime = performance.now() - startTime;

    return {
        operation: 'LDL^T Decomposition',
        description: 'A = LDL^T for symmetric matrix',
        matrixSize: sym.n,
        diagD: Array.from(D.slice(0, Math.min(10, D.length))),
        executionTime
    };
}

function handleSolve(data) {
    const { sym, b } = data;
    const startTime = performance.now();

    const x = solveSymmetric(sym, b);
    const residual = computeResidual(sym, x, b);

    const executionTime = performance.now() - startTime;

    return {
        operation: 'Solve Symmetric System',
        description: 'Ax = b using Cholesky',
        matrixSize: sym.n,
        residualNorm: residual,
        solutionSample: Array.from(x.slice(0, Math.min(10, x.length))),
        executionTime
    };
}

function handleEigenvalues(data) {
    const { sym } = data;
    const startTime = performance.now();

    const result = powerIteration(sym);

    const executionTime = performance.now() - startTime;

    return {
        operation: 'Dominant Eigenvalue',
        description: 'Power iteration method',
        matrixSize: sym.n,
        eigenvalue: result.eigenvalue,
        converged: result.converged,
        eigenvectorSample: Array.from(result.eigenvector.slice(0, Math.min(5, result.eigenvector.length))),
        executionTime
    };
}

function handleBenchmark(data) {
    const { sym, b } = data;
    const n = sym.n;
    const results = [];

    // Mat-vec benchmark
    postMessage({ type: 'progress', percentage: 10 });
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = Math.random();

    let start = performance.now();
    const iterations = Math.min(100, Math.max(1, Math.floor(10000 / n)));
    for (let iter = 0; iter < iterations; iter++) {
        symmetricMatVec(sym, x);
    }
    results.push({
        name: `Mat-Vec (×${iterations})`,
        time: ((performance.now() - start) / iterations).toFixed(3)
    });

    // Cholesky benchmark
    postMessage({ type: 'progress', percentage: 40 });
    if (n <= 1000) {
        try {
            start = performance.now();
            cholesky(sym);
            results.push({
                name: 'Cholesky',
                time: (performance.now() - start).toFixed(3)
            });
        } catch (e) {
            results.push({ name: 'Cholesky', time: 'N/A (not SPD)' });
        }
    }

    // LDL^T benchmark
    postMessage({ type: 'progress', percentage: 60 });
    if (n <= 1000) {
        try {
            start = performance.now();
            ldlt(sym);
            results.push({
                name: 'LDL^T',
                time: (performance.now() - start).toFixed(3)
            });
        } catch (e) {
            results.push({ name: 'LDL^T', time: 'N/A' });
        }
    }

    // Power iteration
    postMessage({ type: 'progress', percentage: 80 });
    start = performance.now();
    powerIteration(sym, 100);
    results.push({
        name: 'Eigenvalue (100 iter)',
        time: (performance.now() - start).toFixed(3)
    });

    postMessage({ type: 'progress', percentage: 100 });

    return {
        operation: 'Benchmark',
        description: 'Performance comparison',
        matrixSize: n,
        packedSize: sym.data.length,
        denseSize: n * n,
        savings: ((1 - sym.data.length / (n * n)) * 100).toFixed(1),
        benchmarks: results
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
            data.sym = generateRandomSymmetric(data.n, data.matrixType);
            data.b = new Float64Array(data.n);
            for (let i = 0; i < data.n; i++) {
                data.b[i] = Math.random() * 10;
            }
        }

        switch (type) {
            case 'multiply':
                result = handleMultiply(data);
                break;
            case 'cholesky':
                result = handleCholesky(data);
                break;
            case 'ldlt':
                result = handleLDLT(data);
                break;
            case 'solve':
                result = handleSolve(data);
                break;
            case 'eigenvalues':
                result = handleEigenvalues(data);
                break;
            case 'benchmark':
                result = handleBenchmark(data);
                break;
            default:
                throw new Error('Unknown operation: ' + type);
        }

        const executionTime = performance.now() - startTime;

        postMessage({
            type: 'result',
            operation: type,
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
