/**
 * Web Worker: QR Decomposition
 * Gram-Schmidt, Householder, and Givens rotation methods
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'gramschmidt':
                result = classicalGramSchmidt(data.matrix);
                break;
            case 'modifiedgs':
                result = modifiedGramSchmidt(data.matrix);
                break;
            case 'householder':
                result = householderQR(data.matrix);
                break;
            case 'givens':
                result = givensQR(data.matrix);
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
 * Classical Gram-Schmidt process
 */
function classicalGramSchmidt(A) {
    const m = A.length;
    const n = A[0].length;

    // Copy A to work with columns
    const Q = [];
    const R = [];

    for (let i = 0; i < m; i++) {
        Q[i] = new Array(n).fill(0);
    }
    for (let i = 0; i < n; i++) {
        R[i] = new Array(n).fill(0);
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let j = 0; j < n; j++) {
        // Get column j of A
        const v = [];
        for (let i = 0; i < m; i++) {
            v[i] = A[i][j];
        }

        // Subtract projections onto previous q vectors
        for (let k = 0; k < j; k++) {
            // R[k][j] = q_k dot a_j
            let dot = 0;
            for (let i = 0; i < m; i++) {
                dot += Q[i][k] * A[i][j];
            }
            R[k][j] = dot;

            // v = v - R[k][j] * q_k
            for (let i = 0; i < m; i++) {
                v[i] -= dot * Q[i][k];
            }
        }

        // Compute norm of v
        let norm = 0;
        for (let i = 0; i < m; i++) {
            norm += v[i] * v[i];
        }
        norm = Math.sqrt(norm);

        R[j][j] = norm;

        // Normalize to get q_j
        if (norm > 1e-14) {
            for (let i = 0; i < m; i++) {
                Q[i][j] = v[i] / norm;
            }
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((j / n) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifyQR(Q, R, A);

    return {
        algorithm: 'Classical Gram-Schmidt',
        description: 'Orthogonalization by sequential projection subtraction',
        Q: Q,
        R: R,
        matrixSize: `${m}×${n}`,
        rows: m,
        cols: n,
        verification: verification,
        orthogonalityError: checkOrthogonality(Q)
    };
}

/**
 * Modified Gram-Schmidt (more numerically stable)
 */
function modifiedGramSchmidt(A) {
    const m = A.length;
    const n = A[0].length;

    // Copy A
    const V = [];
    for (let i = 0; i < m; i++) {
        V[i] = [...A[i]];
    }

    const Q = [];
    const R = [];

    for (let i = 0; i < m; i++) {
        Q[i] = new Array(n).fill(0);
    }
    for (let i = 0; i < n; i++) {
        R[i] = new Array(n).fill(0);
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let j = 0; j < n; j++) {
        // Compute norm of column j
        let norm = 0;
        for (let i = 0; i < m; i++) {
            norm += V[i][j] * V[i][j];
        }
        norm = Math.sqrt(norm);

        R[j][j] = norm;

        // Set Q column j
        if (norm > 1e-14) {
            for (let i = 0; i < m; i++) {
                Q[i][j] = V[i][j] / norm;
            }
        }

        // Orthogonalize remaining columns against q_j
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

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((j / n) * 80)
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifyQR(Q, R, A);

    return {
        algorithm: 'Modified Gram-Schmidt',
        description: 'Improved numerical stability by immediate orthogonalization',
        Q: Q,
        R: R,
        matrixSize: `${m}×${n}`,
        rows: m,
        cols: n,
        verification: verification,
        orthogonalityError: checkOrthogonality(Q)
    };
}

/**
 * Householder QR decomposition
 */
function householderQR(A) {
    const m = A.length;
    const n = A[0].length;

    // Copy A to R
    const R = [];
    for (let i = 0; i < m; i++) {
        R[i] = [...A[i]];
    }

    // Initialize Q as identity
    const Q = [];
    for (let i = 0; i < m; i++) {
        Q[i] = new Array(m).fill(0);
        Q[i][i] = 1;
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    const numReflections = Math.min(m - 1, n);

    for (let k = 0; k < numReflections; k++) {
        // Extract column k below diagonal
        const x = [];
        for (let i = k; i < m; i++) {
            x.push(R[i][k]);
        }

        // Compute Householder vector
        let normX = 0;
        for (let i = 0; i < x.length; i++) {
            normX += x[i] * x[i];
        }
        normX = Math.sqrt(normX);

        if (normX < 1e-14) continue;

        const sign = x[0] >= 0 ? 1 : -1;
        x[0] += sign * normX;

        // Normalize v
        let normV = 0;
        for (let i = 0; i < x.length; i++) {
            normV += x[i] * x[i];
        }
        normV = Math.sqrt(normV);

        if (normV < 1e-14) continue;

        for (let i = 0; i < x.length; i++) {
            x[i] /= normV;
        }

        // Apply H = I - 2vv^T to R from the left
        for (let j = k; j < n; j++) {
            let dot = 0;
            for (let i = 0; i < x.length; i++) {
                dot += x[i] * R[k + i][j];
            }
            for (let i = 0; i < x.length; i++) {
                R[k + i][j] -= 2 * dot * x[i];
            }
        }

        // Apply H to Q from the right (Q = Q * H)
        for (let i = 0; i < m; i++) {
            let dot = 0;
            for (let j = 0; j < x.length; j++) {
                dot += Q[i][k + j] * x[j];
            }
            for (let j = 0; j < x.length; j++) {
                Q[i][k + j] -= 2 * dot * x[j];
            }
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((k / numReflections) * 80)
        });
    }

    // Truncate Q and R for non-square case
    const Qfinal = [];
    const Rfinal = [];
    for (let i = 0; i < m; i++) {
        Qfinal[i] = Q[i].slice(0, n);
    }
    for (let i = 0; i < n; i++) {
        Rfinal[i] = R[i].slice(0, n);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifyQR(Qfinal, Rfinal, A);

    return {
        algorithm: 'Householder Reflections',
        description: 'Uses orthogonal reflections for excellent numerical stability',
        Q: Qfinal,
        R: Rfinal,
        matrixSize: `${m}×${n}`,
        rows: m,
        cols: n,
        numReflections: numReflections,
        verification: verification,
        orthogonalityError: checkOrthogonality(Qfinal)
    };
}

/**
 * Givens rotation QR decomposition
 */
function givensQR(A) {
    const m = A.length;
    const n = A[0].length;

    // Copy A to R
    const R = [];
    for (let i = 0; i < m; i++) {
        R[i] = [...A[i]];
    }

    // Initialize Q as identity
    const Q = [];
    for (let i = 0; i < m; i++) {
        Q[i] = new Array(m).fill(0);
        Q[i][i] = 1;
    }

    let rotationCount = 0;

    self.postMessage({ type: 'progress', percentage: 10 });

    const totalOps = n * (m - 1);
    let opCount = 0;

    for (let j = 0; j < n; j++) {
        for (let i = m - 1; i > j; i--) {
            if (Math.abs(R[i][j]) < 1e-14) {
                opCount++;
                continue;
            }

            // Compute Givens rotation to zero R[i][j]
            const a = R[i - 1][j];
            const b = R[i][j];
            const r = Math.sqrt(a * a + b * b);
            const c = a / r;
            const s = -b / r;

            rotationCount++;

            // Apply rotation to R
            for (let k = 0; k < n; k++) {
                const temp1 = R[i - 1][k];
                const temp2 = R[i][k];
                R[i - 1][k] = c * temp1 - s * temp2;
                R[i][k] = s * temp1 + c * temp2;
            }

            // Apply rotation to Q (accumulate from right)
            for (let k = 0; k < m; k++) {
                const temp1 = Q[k][i - 1];
                const temp2 = Q[k][i];
                Q[k][i - 1] = c * temp1 - s * temp2;
                Q[k][i] = s * temp1 + c * temp2;
            }

            opCount++;
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((opCount / totalOps) * 80)
            });
        }
    }

    // Truncate Q for non-square case
    const Qfinal = [];
    const Rfinal = [];
    for (let i = 0; i < m; i++) {
        Qfinal[i] = Q[i].slice(0, n);
    }
    for (let i = 0; i < n; i++) {
        Rfinal[i] = R[i].slice(0, n);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    const verification = verifyQR(Qfinal, Rfinal, A);

    return {
        algorithm: 'Givens Rotations',
        description: 'Uses plane rotations, ideal for sparse matrices',
        Q: Qfinal,
        R: Rfinal,
        matrixSize: `${m}×${n}`,
        rows: m,
        cols: n,
        rotationCount: rotationCount,
        verification: verification,
        orthogonalityError: checkOrthogonality(Qfinal)
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A) {
    const m = A.length;
    const n = A[0].length;
    const results = [];

    self.postMessage({ type: 'progress', percentage: 5 });

    // Classical Gram-Schmidt
    try {
        const start = performance.now();
        const res = classicalGramSchmidt(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Classical GS',
            time: time.toFixed(2),
            qrError: res.verification.maxError.toExponential(2),
            orthError: res.orthogonalityError.toExponential(2),
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Classical GS', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 25 });

    // Modified Gram-Schmidt
    try {
        const start = performance.now();
        const res = modifiedGramSchmidt(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Modified GS',
            time: time.toFixed(2),
            qrError: res.verification.maxError.toExponential(2),
            orthError: res.orthogonalityError.toExponential(2),
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Modified GS', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 50 });

    // Householder
    try {
        const start = performance.now();
        const res = householderQR(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Householder',
            time: time.toFixed(2),
            qrError: res.verification.maxError.toExponential(2),
            orthError: res.orthogonalityError.toExponential(2),
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Householder', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 75 });

    // Givens
    try {
        const start = performance.now();
        const res = givensQR(A);
        const time = performance.now() - start;
        results.push({
            algorithm: 'Givens',
            time: time.toFixed(2),
            qrError: res.verification.maxError.toExponential(2),
            orthError: res.orthogonalityError.toExponential(2),
            success: true
        });
    } catch (e) {
        results.push({ algorithm: 'Givens', error: e.message, success: false });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Get best result (Householder is typically most stable)
    let bestResult = null;
    try {
        bestResult = householderQR(A);
    } catch (e) {
        // fallback
    }

    return {
        algorithm: 'Algorithm Comparison',
        comparison: results,
        Q: bestResult?.Q,
        R: bestResult?.R,
        matrixSize: `${m}×${n}`,
        rows: m,
        cols: n,
        description: 'Comparison of QR decomposition methods'
    };
}

// ========== Helper Functions ==========

function verifyQR(Q, R, A) {
    const m = A.length;
    const n = A[0].length;
    let maxError = 0;

    // Compute Q * R
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < Q[0].length; k++) {
                sum += Q[i][k] * R[k][j];
            }
            maxError = Math.max(maxError, Math.abs(sum - A[i][j]));
        }
    }

    return {
        maxError: maxError,
        isValid: maxError < 1e-10
    };
}

function checkOrthogonality(Q) {
    const m = Q.length;
    const n = Q[0].length;
    let maxError = 0;

    // Check Q^T * Q = I (for the columns)
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let dot = 0;
            for (let k = 0; k < m; k++) {
                dot += Q[k][i] * Q[k][j];
            }
            const expected = (i === j) ? 1 : 0;
            maxError = Math.max(maxError, Math.abs(dot - expected));
        }
    }

    return maxError;
}
