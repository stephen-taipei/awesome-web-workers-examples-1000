/**
 * Web Worker: SVD Decomposition
 * Singular Value Decomposition: A = UΣV^T
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'powerIteration':
                result = powerIterationSVD(data.matrix, data.numSingular);
                break;
            case 'golubKahan':
                result = golubKahanSVD(data.matrix);
                break;
            case 'jacobi':
                result = jacobiSVD(data.matrix);
                break;
            case 'compare':
                result = compareAlgorithms(data.matrix, data.numSingular);
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
 * Power Iteration SVD - finds top k singular values/vectors
 */
function powerIterationSVD(A, numSingular) {
    const m = A.length;
    const n = A[0].length;
    const k = numSingular > 0 ? Math.min(numSingular, Math.min(m, n)) : Math.min(m, n);
    const maxIter = 100;
    const tol = 1e-10;

    // Work with A^T * A for right singular vectors
    const AtA = multiplyAtA(A);

    const singularValues = [];
    const V = [];
    const U = [];

    // Copy of A for deflation
    const Acopy = A.map(row => [...row]);

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let i = 0; i < k; i++) {
        // Random initial vector
        let v = randomVector(n);
        let sigma = 0;

        for (let iter = 0; iter < maxIter; iter++) {
            // Power iteration: v = A^T * A * v
            const Av = multiplyMatrixVector(Acopy, v);
            const AtAv = multiplyTransposeVector(Acopy, Av);

            // Normalize
            const norm = vectorNorm(AtAv);
            if (norm < tol) break;

            const vNew = AtAv.map(x => x / norm);

            // Check convergence
            let diff = 0;
            for (let j = 0; j < n; j++) {
                diff += Math.abs(Math.abs(vNew[j]) - Math.abs(v[j]));
            }

            v = vNew;
            sigma = Math.sqrt(norm);

            if (diff < tol) break;
        }

        // Compute u = A * v / sigma
        const Av = multiplyMatrixVector(Acopy, v);
        const u = sigma > tol ? Av.map(x => x / sigma) : Av;

        singularValues.push(sigma);
        V.push(v);
        U.push(u);

        // Deflation: A = A - sigma * u * v^T
        for (let j = 0; j < m; j++) {
            for (let l = 0; l < n; l++) {
                Acopy[j][l] -= sigma * u[j] * v[l];
            }
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((i / k) * 80)
        });
    }

    // Convert to matrix form
    const Umatrix = transposeVectors(U, m);
    const Vmatrix = transposeVectors(V, n);
    const Sigma = createSigmaMatrix(singularValues, m, n);

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifySVD(Umatrix, Sigma, Vmatrix, A);

    return {
        algorithm: 'Power Iteration SVD',
        description: 'Iterative method for computing top singular values',
        U: Umatrix,
        Sigma: Sigma,
        V: Vmatrix,
        singularValues: singularValues,
        matrixSize: `${m}×${n}`,
        rows: m,
        cols: n,
        rank: singularValues.filter(s => s > tol).length,
        verification: verification
    };
}

/**
 * Golub-Kahan Bidiagonalization SVD
 */
function golubKahanSVD(A) {
    const m = A.length;
    const n = A[0].length;
    const minDim = Math.min(m, n);

    // Copy A
    let B = A.map(row => [...row]);

    // Initialize U and V as identity
    let U = identity(m);
    let V = identity(n);

    self.postMessage({ type: 'progress', percentage: 10 });

    // Bidiagonalization using Householder reflections
    for (let k = 0; k < minDim; k++) {
        // Left Householder to zero out column below diagonal
        if (k < m) {
            const x = [];
            for (let i = k; i < m; i++) x.push(B[i][k]);
            const v = householderVector(x);

            // Apply to B
            applyHouseholderLeft(B, v, k, k);
            // Accumulate in U
            applyHouseholderRight(U, v, k);
        }

        // Right Householder to zero out row to the right of superdiagonal
        if (k < n - 2) {
            const x = [];
            for (let j = k + 1; j < n; j++) x.push(B[k][j]);
            const v = householderVector(x);

            // Apply to B
            applyHouseholderRight(B, v, k + 1);
            // Accumulate in V
            applyHouseholderRight(V, v, k + 1);
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((k / minDim) * 40)
        });
    }

    // Extract bidiagonal elements
    const d = []; // diagonal
    const e = []; // superdiagonal
    for (let i = 0; i < minDim; i++) {
        d.push(B[i][i]);
        if (i < minDim - 1 && i < n - 1) {
            e.push(B[i][i + 1]);
        }
    }

    // Implicit QR iteration on bidiagonal matrix
    const maxIter = 30 * minDim;
    const tol = 1e-12;

    for (let iter = 0; iter < maxIter; iter++) {
        // Find largest q such that B33 is diagonal
        let q = 0;
        for (let i = minDim - 2; i >= 0; i--) {
            if (Math.abs(e[i]) > tol * (Math.abs(d[i]) + Math.abs(d[i + 1]))) {
                break;
            }
            q++;
        }

        if (q === minDim - 1) break; // Converged

        // Find smallest p such that B22 is unreduced
        let p = minDim - 2 - q;
        while (p > 0 && Math.abs(e[p - 1]) > tol * (Math.abs(d[p - 1]) + Math.abs(d[p]))) {
            p--;
        }

        // Golub-Kahan step
        golubKahanStep(d, e, U, V, p, minDim - 1 - q);

        self.postMessage({
            type: 'progress',
            percentage: 50 + Math.round((iter / maxIter) * 40)
        });
    }

    // Make singular values positive
    const singularValues = [];
    for (let i = 0; i < minDim; i++) {
        if (d[i] < 0) {
            d[i] = -d[i];
            for (let j = 0; j < m; j++) {
                U[j][i] = -U[j][i];
            }
        }
        singularValues.push(d[i]);
    }

    // Sort by descending singular values
    const indices = singularValues.map((v, i) => i);
    indices.sort((a, b) => singularValues[b] - singularValues[a]);

    const sortedSV = indices.map(i => singularValues[i]);
    const sortedU = [];
    const sortedV = [];

    for (let i = 0; i < m; i++) {
        sortedU[i] = indices.map(j => U[i][j]);
    }
    for (let i = 0; i < n; i++) {
        sortedV[i] = indices.map(j => V[i][j]);
    }

    const Sigma = createSigmaMatrix(sortedSV, m, n);

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifySVD(sortedU, Sigma, sortedV, A);

    return {
        algorithm: 'Golub-Kahan Bidiagonalization',
        description: 'Full SVD via bidiagonalization and implicit QR',
        U: sortedU,
        Sigma: Sigma,
        V: sortedV,
        singularValues: sortedSV,
        matrixSize: `${m}×${n}`,
        rows: m,
        cols: n,
        rank: sortedSV.filter(s => s > 1e-10).length,
        verification: verification
    };
}

/**
 * One-Sided Jacobi SVD
 */
function jacobiSVD(A) {
    const m = A.length;
    const n = A[0].length;
    const maxIter = 100;
    const tol = 1e-12;

    // Work with B = A^T * A
    let B = multiplyAtA(A);

    // V accumulates rotations
    let V = identity(n);

    self.postMessage({ type: 'progress', percentage: 10 });

    // Jacobi iterations
    for (let iter = 0; iter < maxIter; iter++) {
        let maxOff = 0;

        for (let p = 0; p < n - 1; p++) {
            for (let q = p + 1; q < n; q++) {
                maxOff = Math.max(maxOff, Math.abs(B[p][q]));

                if (Math.abs(B[p][q]) < tol) continue;

                // Compute Jacobi rotation
                const tau = (B[q][q] - B[p][p]) / (2 * B[p][q]);
                const t = Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
                const c = 1 / Math.sqrt(1 + t * t);
                const s = c * t;

                // Apply rotation to B
                applyJacobiRotation(B, p, q, c, s);

                // Accumulate in V
                for (let i = 0; i < n; i++) {
                    const vip = V[i][p];
                    const viq = V[i][q];
                    V[i][p] = c * vip - s * viq;
                    V[i][q] = s * vip + c * viq;
                }
            }
        }

        if (maxOff < tol) break;

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((iter / maxIter) * 80)
        });
    }

    // Singular values are square roots of diagonal of B
    const singularValues = [];
    for (let i = 0; i < n; i++) {
        singularValues.push(Math.sqrt(Math.max(0, B[i][i])));
    }

    // Compute U = A * V * Sigma^-1
    const AV = multiplyMatrices(A, V);
    const U = [];
    for (let i = 0; i < m; i++) {
        U[i] = [];
        for (let j = 0; j < n; j++) {
            U[i][j] = singularValues[j] > tol ? AV[i][j] / singularValues[j] : 0;
        }
    }

    // Sort by descending singular values
    const indices = singularValues.map((v, i) => i);
    indices.sort((a, b) => singularValues[b] - singularValues[a]);

    const sortedSV = indices.map(i => singularValues[i]);
    const sortedU = U.map(row => indices.map(j => row[j]));
    const sortedV = V.map(row => indices.map(j => row[j]));

    const Sigma = createSigmaMatrix(sortedSV, m, n);

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifySVD(sortedU, Sigma, sortedV, A);

    return {
        algorithm: 'One-Sided Jacobi SVD',
        description: 'High accuracy SVD via Jacobi rotations',
        U: sortedU,
        Sigma: Sigma,
        V: sortedV,
        singularValues: sortedSV,
        matrixSize: `${m}×${n}`,
        rows: m,
        cols: n,
        rank: sortedSV.filter(s => s > 1e-10).length,
        verification: verification
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A, numSingular) {
    const m = A.length;
    const n = A[0].length;
    const results = [];

    self.postMessage({ type: 'progress', percentage: 5 });

    // Power Iteration
    try {
        const start = performance.now();
        const res = powerIterationSVD(A, numSingular);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Power Iteration',
            time: time.toFixed(2),
            error: res.verification.maxError.toExponential(2),
            rank: res.rank,
            topSV: res.singularValues[0]?.toFixed(4) || '-',
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Power Iteration', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 35 });

    // Golub-Kahan
    try {
        const start = performance.now();
        const res = golubKahanSVD(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Golub-Kahan',
            time: time.toFixed(2),
            error: res.verification.maxError.toExponential(2),
            rank: res.rank,
            topSV: res.singularValues[0]?.toFixed(4) || '-',
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Golub-Kahan', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 70 });

    // Jacobi
    try {
        const start = performance.now();
        const res = jacobiSVD(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Jacobi',
            time: time.toFixed(2),
            error: res.verification.maxError.toExponential(2),
            rank: res.rank,
            topSV: res.singularValues[0]?.toFixed(4) || '-',
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Jacobi', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Get best result
    let bestResult = null;
    try {
        bestResult = jacobiSVD(A);
    } catch (e) {}

    return {
        algorithm: 'Algorithm Comparison',
        comparison: results,
        U: bestResult?.U,
        Sigma: bestResult?.Sigma,
        V: bestResult?.V,
        singularValues: bestResult?.singularValues,
        matrixSize: `${m}×${n}`,
        rows: m,
        cols: n,
        rank: bestResult?.rank,
        description: 'Comparison of SVD algorithms'
    };
}

// ========== Helper Functions ==========

function multiplyAtA(A) {
    const m = A.length;
    const n = A[0].length;
    const result = [];
    for (let i = 0; i < n; i++) {
        result[i] = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < m; k++) {
                sum += A[k][i] * A[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
}

function multiplyMatrices(A, B) {
    const m = A.length;
    const n = B[0].length;
    const p = B.length;
    const result = [];
    for (let i = 0; i < m; i++) {
        result[i] = [];
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < p; k++) {
                sum += A[i][k] * B[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
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

function multiplyTransposeVector(A, v) {
    const n = A[0].length;
    const result = [];
    for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let i = 0; i < v.length; i++) {
            sum += A[i][j] * v[i];
        }
        result.push(sum);
    }
    return result;
}

function randomVector(n) {
    const v = [];
    for (let i = 0; i < n; i++) {
        v.push(Math.random() - 0.5);
    }
    const norm = vectorNorm(v);
    return v.map(x => x / norm);
}

function vectorNorm(v) {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
        sum += v[i] * v[i];
    }
    return Math.sqrt(sum);
}

function identity(n) {
    const I = [];
    for (let i = 0; i < n; i++) {
        I[i] = new Array(n).fill(0);
        I[i][i] = 1;
    }
    return I;
}

function transposeVectors(vectors, dim) {
    const result = [];
    for (let i = 0; i < dim; i++) {
        result[i] = [];
        for (let j = 0; j < vectors.length; j++) {
            result[i][j] = vectors[j][i] || 0;
        }
    }
    return result;
}

function createSigmaMatrix(singularValues, m, n) {
    const Sigma = [];
    for (let i = 0; i < m; i++) {
        Sigma[i] = new Array(n).fill(0);
        if (i < singularValues.length && i < n) {
            Sigma[i][i] = singularValues[i];
        }
    }
    return Sigma;
}

function householderVector(x) {
    const n = x.length;
    const norm = vectorNorm(x);
    if (norm < 1e-14) return new Array(n).fill(0);

    const v = [...x];
    v[0] += Math.sign(x[0]) * norm;

    const vNorm = vectorNorm(v);
    return v.map(val => val / vNorm);
}

function applyHouseholderLeft(A, v, rowStart, colStart) {
    const m = A.length;
    const n = A[0].length;

    for (let j = colStart; j < n; j++) {
        let dot = 0;
        for (let i = 0; i < v.length; i++) {
            dot += v[i] * A[rowStart + i][j];
        }
        for (let i = 0; i < v.length; i++) {
            A[rowStart + i][j] -= 2 * dot * v[i];
        }
    }
}

function applyHouseholderRight(A, v, colStart) {
    const m = A.length;

    for (let i = 0; i < m; i++) {
        let dot = 0;
        for (let j = 0; j < v.length; j++) {
            dot += A[i][colStart + j] * v[j];
        }
        for (let j = 0; j < v.length; j++) {
            A[i][colStart + j] -= 2 * dot * v[j];
        }
    }
}

function golubKahanStep(d, e, U, V, p, q) {
    // Wilkinson shift
    const n = d.length;
    const dm = d[q];
    const em = q > 0 ? e[q - 1] : 0;

    const T = (d[q - 1] * d[q - 1] + e[q - 1] * e[q - 1] - dm * dm) / 2;
    const det = d[q - 1] * d[q - 1] * dm * dm;
    const mu = dm * dm - det / (T + Math.sign(T) * Math.sqrt(T * T + det));

    let y = d[p] * d[p] - mu;
    let z = d[p] * e[p];

    for (let k = p; k < q; k++) {
        // Givens rotation to zero z in (y, z)
        const r = Math.sqrt(y * y + z * z);
        const c = y / r;
        const s = -z / r;

        // Apply to bidiagonal
        if (k > p) e[k - 1] = r;

        y = c * d[k] - s * e[k];
        z = -s * d[k + 1];
        d[k] = y;
        e[k] = c * e[k] + s * d[k + 1];
        d[k + 1] = c * d[k + 1];

        // Update V
        for (let i = 0; i < V.length; i++) {
            const vik = V[i][k];
            const vik1 = V[i][k + 1];
            V[i][k] = c * vik - s * vik1;
            V[i][k + 1] = s * vik + c * vik1;
        }

        y = d[k];
        z = -s * e[k];

        // Another Givens
        const r2 = Math.sqrt(y * y + z * z);
        const c2 = y / r2;
        const s2 = -z / r2;

        d[k] = r2;
        y = c2 * e[k] + s2 * d[k + 1];
        d[k + 1] = -s2 * e[k] + c2 * d[k + 1];
        e[k] = y;

        if (k < q - 1) {
            z = s2 * e[k + 1];
            e[k + 1] = c2 * e[k + 1];
        }

        // Update U
        for (let i = 0; i < U.length; i++) {
            const uik = U[i][k];
            const uik1 = U[i][k + 1];
            U[i][k] = c2 * uik - s2 * uik1;
            U[i][k + 1] = s2 * uik + c2 * uik1;
        }

        y = d[k + 1];
    }
}

function applyJacobiRotation(B, p, q, c, s) {
    const n = B.length;

    for (let i = 0; i < n; i++) {
        const bip = B[i][p];
        const biq = B[i][q];
        B[i][p] = c * bip - s * biq;
        B[i][q] = s * bip + c * biq;
    }

    for (let j = 0; j < n; j++) {
        const bpj = B[p][j];
        const bqj = B[q][j];
        B[p][j] = c * bpj - s * bqj;
        B[q][j] = s * bpj + c * bqj;
    }
}

function verifySVD(U, Sigma, V, A) {
    const m = A.length;
    const n = A[0].length;
    let maxError = 0;

    // Compute U * Sigma * V^T
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < Math.min(U[0].length, V[0].length); k++) {
                sum += U[i][k] * Sigma[k][k] * V[j][k];
            }
            maxError = Math.max(maxError, Math.abs(sum - A[i][j]));
        }
    }

    return {
        maxError: maxError,
        isValid: maxError < 1e-8
    };
}
