/**
 * Tridiagonal Matrix Solver Worker
 * Implements Thomas Algorithm (TDMA) and parallel variants
 */

/**
 * Thomas Algorithm (Tridiagonal Matrix Algorithm / TDMA)
 * Solves Ax = b where A is tridiagonal
 *
 * Matrix structure:
 * [d0 c0  0  0  0 ] [x0]   [b0]
 * [a0 d1 c1  0  0 ] [x1]   [b1]
 * [ 0 a1 d2 c2  0 ] [x2] = [b2]
 * [ 0  0 a2 d3 c3 ] [x3]   [b3]
 * [ 0  0  0 a3 d4 ] [x4]   [b4]
 *
 * @param {Float64Array} a - Sub-diagonal (length n-1)
 * @param {Float64Array} d - Main diagonal (length n)
 * @param {Float64Array} c - Super-diagonal (length n-1)
 * @param {Float64Array} b - Right-hand side (length n)
 */
function thomasAlgorithm(a, d, c, b) {
    const n = d.length;

    // Modified coefficients
    const cPrime = new Float64Array(n - 1);
    const dPrime = new Float64Array(n);
    const x = new Float64Array(n);

    // Forward sweep
    cPrime[0] = c[0] / d[0];
    dPrime[0] = b[0] / d[0];

    for (let i = 1; i < n; i++) {
        const denom = d[i] - a[i - 1] * cPrime[i - 1];
        if (Math.abs(denom) < 1e-15) {
            throw new Error('Zero pivot - matrix may be singular or not diagonally dominant');
        }
        if (i < n - 1) {
            cPrime[i] = c[i] / denom;
        }
        dPrime[i] = (b[i] - a[i - 1] * dPrime[i - 1]) / denom;

        if (i % 100000 === 0) {
            postMessage({ type: 'progress', percentage: Math.floor((i / n) * 50) });
        }
    }

    // Back substitution
    x[n - 1] = dPrime[n - 1];

    for (let i = n - 2; i >= 0; i--) {
        x[i] = dPrime[i] - cPrime[i] * x[i + 1];

        if ((n - 2 - i) % 100000 === 0) {
            postMessage({ type: 'progress', percentage: 50 + Math.floor(((n - 2 - i) / n) * 50) });
        }
    }

    return x;
}

/**
 * Cyclic Reduction Algorithm
 * Parallel-friendly algorithm with O(n log n) operations but O(log n) parallel steps
 */
function cyclicReduction(a, d, c, b) {
    const n = d.length;

    // Pad to power of 2
    const log2n = Math.ceil(Math.log2(n));
    const nPadded = Math.pow(2, log2n);

    // Allocate padded arrays
    let aArr = new Float64Array(nPadded);
    let dArr = new Float64Array(nPadded);
    let cArr = new Float64Array(nPadded);
    let bArr = new Float64Array(nPadded);

    // Copy original values
    for (let i = 0; i < n - 1; i++) {
        aArr[i + 1] = a[i];
        cArr[i] = c[i];
    }
    for (let i = 0; i < n; i++) {
        dArr[i] = d[i];
        bArr[i] = b[i];
    }
    // Pad with identity equations
    for (let i = n; i < nPadded; i++) {
        dArr[i] = 1;
    }

    // Forward reduction
    let stride = 1;
    for (let level = 0; level < log2n; level++) {
        const newStride = stride * 2;

        for (let i = newStride - 1; i < nPadded; i += newStride) {
            const iMinus = i - stride;
            const iPlus = Math.min(i + stride, nPadded - 1);

            if (Math.abs(dArr[iMinus]) > 1e-15 && Math.abs(dArr[iPlus]) > 1e-15) {
                const alpha = -aArr[i] / dArr[iMinus];
                const gamma = -cArr[i] / dArr[iPlus];

                aArr[i] = alpha * aArr[iMinus];
                dArr[i] = dArr[i] + alpha * cArr[iMinus] + gamma * aArr[iPlus];
                cArr[i] = gamma * cArr[iPlus];
                bArr[i] = bArr[i] + alpha * bArr[iMinus] + gamma * bArr[iPlus];
            }
        }

        stride = newStride;
        postMessage({ type: 'progress', percentage: Math.floor((level / log2n) * 50) });
    }

    // Solve reduced system
    const x = new Float64Array(nPadded);
    x[nPadded - 1] = bArr[nPadded - 1] / dArr[nPadded - 1];

    // Back substitution
    stride = nPadded / 2;
    for (let level = log2n - 1; level >= 0; level--) {
        for (let i = stride - 1; i < nPadded; i += stride * 2) {
            const iMinus = i - stride;
            const iPlus = i + stride;

            let rhs = bArr[i];
            if (iMinus >= 0) rhs -= aArr[i] * x[iMinus];
            if (iPlus < nPadded) rhs -= cArr[i] * x[iPlus];

            if (Math.abs(dArr[i]) > 1e-15) {
                x[i] = rhs / dArr[i];
            }
        }

        stride = stride / 2;
        postMessage({ type: 'progress', percentage: 50 + Math.floor(((log2n - level) / log2n) * 50) });
    }

    return x.slice(0, n);
}

/**
 * Recursive Doubling (Parallel Prefix)
 * Another parallel approach using prefix sums
 */
function recursiveDoubling(a, d, c, b) {
    const n = d.length;

    // Convert to 2x2 matrix form and use parallel prefix
    // Each equation: a[i]*x[i-1] + d[i]*x[i] + c[i]*x[i+1] = b[i]

    // Initialize transformation matrices
    let alpha = new Float64Array(n);
    let beta = new Float64Array(n);
    let gamma = new Float64Array(n);
    let delta = new Float64Array(n);

    // Initial transformation
    for (let i = 0; i < n; i++) {
        if (Math.abs(d[i]) < 1e-15) {
            throw new Error('Zero diagonal element');
        }
        alpha[i] = i > 0 ? -a[i - 1] / d[i] : 0;
        beta[i] = i < n - 1 ? -c[i] / d[i] : 0;
        gamma[i] = b[i] / d[i];
        delta[i] = 1;
    }

    // Recursive doubling steps
    const log2n = Math.ceil(Math.log2(n));

    for (let k = 0; k < log2n; k++) {
        const step = Math.pow(2, k);

        const newAlpha = new Float64Array(n);
        const newBeta = new Float64Array(n);
        const newGamma = new Float64Array(n);

        for (let i = 0; i < n; i++) {
            const iLeft = i - step;
            const iRight = i + step;

            let aLeft = 0, bLeft = 0, gLeft = 0;
            let aRight = 0, bRight = 0, gRight = 0;

            if (iLeft >= 0) {
                const denom = 1 - beta[iLeft] * alpha[i];
                if (Math.abs(denom) > 1e-15) {
                    aLeft = alpha[iLeft] * alpha[i] / denom;
                    gLeft = (gamma[iLeft] * alpha[i] + gamma[i]) / denom - gamma[i];
                }
            }

            if (iRight < n) {
                const denom = 1 - alpha[iRight] * beta[i];
                if (Math.abs(denom) > 1e-15) {
                    bRight = beta[iRight] * beta[i] / denom;
                    gRight = (gamma[iRight] * beta[i]) / denom;
                }
            }

            newAlpha[i] = alpha[i] + aLeft;
            newBeta[i] = beta[i] + bRight;
            newGamma[i] = gamma[i] + gLeft + gRight;
        }

        alpha = newAlpha;
        beta = newBeta;
        gamma = newGamma;

        postMessage({ type: 'progress', percentage: Math.floor(((k + 1) / log2n) * 100) });
    }

    // Solution is in gamma
    return gamma;
}

/**
 * Generate random tridiagonal system
 */
function generateRandomTridiagonal(n, type) {
    const a = new Float64Array(n - 1);
    const d = new Float64Array(n);
    const c = new Float64Array(n - 1);
    const b = new Float64Array(n);

    switch (type) {
        case 'diagonalDominant':
            // Diagonally dominant: |d[i]| > |a[i-1]| + |c[i]|
            for (let i = 0; i < n; i++) {
                if (i > 0) a[i - 1] = Math.random() * 2 - 1;
                if (i < n - 1) c[i] = Math.random() * 2 - 1;
                const offDiagSum = (i > 0 ? Math.abs(a[i - 1]) : 0) + (i < n - 1 ? Math.abs(c[i]) : 0);
                d[i] = offDiagSum + 1 + Math.random();
                b[i] = Math.random() * 10;
            }
            break;

        case 'symmetric':
            // Symmetric positive definite
            for (let i = 0; i < n - 1; i++) {
                a[i] = -1;
                c[i] = -1;
            }
            for (let i = 0; i < n; i++) {
                d[i] = 2 + Math.random() * 0.5;
                b[i] = Math.random() * 10;
            }
            break;

        case 'general':
        default:
            for (let i = 0; i < n - 1; i++) {
                a[i] = Math.random() * 2 - 1;
                c[i] = Math.random() * 2 - 1;
            }
            for (let i = 0; i < n; i++) {
                d[i] = (Math.random() * 4 - 2) || 1; // Avoid zero
                b[i] = Math.random() * 10;
            }
            break;
    }

    return { a, d, c, b };
}

/**
 * Compute residual ||Ax - b||
 */
function computeResidual(a, d, c, x, b) {
    const n = d.length;
    let normSq = 0;

    for (let i = 0; i < n; i++) {
        let Ax = d[i] * x[i];
        if (i > 0) Ax += a[i - 1] * x[i - 1];
        if (i < n - 1) Ax += c[i] * x[i + 1];

        const diff = Ax - b[i];
        normSq += diff * diff;
    }

    return Math.sqrt(normSq);
}

/**
 * Solve tridiagonal system
 */
function solveTridiagonal(algorithm, data) {
    const { a, d, c, b } = data;
    const n = d.length;
    const startTime = performance.now();

    let x, algorithmName, description;

    switch (algorithm) {
        case 'thomas':
            x = thomasAlgorithm(a, d, c, b);
            algorithmName = 'Thomas Algorithm (TDMA)';
            description = 'O(n) sequential forward/backward sweep';
            break;

        case 'cyclicReduction':
            x = cyclicReduction(a, d, c, b);
            algorithmName = 'Cyclic Reduction';
            description = 'O(n log n) with O(log n) parallel steps';
            break;

        case 'recursiveDoubling':
            x = recursiveDoubling(a, d, c, b);
            algorithmName = 'Recursive Doubling';
            description = 'Parallel prefix approach';
            break;

        default:
            throw new Error('Unknown algorithm: ' + algorithm);
    }

    const executionTime = performance.now() - startTime;
    const residual = computeResidual(a, d, c, x, b);

    return {
        algorithm: algorithmName,
        description,
        systemSize: n,
        residualNorm: residual,
        solutionSample: Array.from(x.slice(0, Math.min(10, x.length))),
        executionTime
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(data) {
    const { a, d, c, b } = data;
    const n = d.length;
    const results = [];

    const algorithms = [
        { key: 'thomas', name: 'Thomas (TDMA)' },
        { key: 'cyclicReduction', name: 'Cyclic Reduction' },
        { key: 'recursiveDoubling', name: 'Recursive Doubling' }
    ];

    // Only run parallel algorithms for smaller n (they have more overhead)
    const maxForParallel = 100000;

    for (const algo of algorithms) {
        if ((algo.key === 'cyclicReduction' || algo.key === 'recursiveDoubling') && n > maxForParallel) {
            results.push({
                algorithm: algo.name,
                time: '-',
                residual: '-',
                success: false,
                note: 'Skipped (n too large)'
            });
            continue;
        }

        try {
            const start = performance.now();
            let x;

            switch (algo.key) {
                case 'thomas':
                    x = thomasAlgorithm(a, d, c, b);
                    break;
                case 'cyclicReduction':
                    x = cyclicReduction(a, d, c, b);
                    break;
                case 'recursiveDoubling':
                    x = recursiveDoubling(a, d, c, b);
                    break;
            }

            const time = performance.now() - start;
            const residual = computeResidual(a, d, c, x, b);

            results.push({
                algorithm: algo.name,
                time: time.toFixed(2),
                residual: residual.toExponential(2),
                success: true
            });
        } catch (error) {
            results.push({
                algorithm: algo.name,
                time: '-',
                residual: '-',
                success: false,
                note: error.message
            });
        }

        postMessage({ type: 'progress', percentage: Math.floor((results.length / algorithms.length) * 100) });
    }

    return {
        algorithm: 'Algorithm Comparison',
        description: 'Comparing all tridiagonal solvers',
        systemSize: n,
        comparison: results
    };
}

// Message handler
self.onmessage = function(e) {
    const { type, data } = e.data;

    try {
        let result;
        const startTime = performance.now();

        // Generate data if needed
        let systemData = data;
        if (data.generate) {
            systemData = generateRandomTridiagonal(data.n, data.systemType);
        }

        if (type === 'compare') {
            result = compareAlgorithms(systemData);
        } else {
            result = solveTridiagonal(type, systemData);
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
