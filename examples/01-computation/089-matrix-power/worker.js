/**
 * Web Worker for Matrix Power computation
 * Computes A^n using various algorithms
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let A, n, power;

        if (data.generate) {
            n = data.size;
            A = generateMatrix(n, data.matrixType);
        } else {
            A = new Float64Array(data.A);
            n = data.n;
        }
        power = data.power;

        let result;

        switch (type) {
            case 'binary':
                result = computeBinaryPower(A, n, power);
                break;
            case 'naive':
                result = computeNaivePower(A, n, power);
                break;
            case 'diagonalization':
                result = computeDiagPower(A, n, power);
                break;
            case 'compare':
                result = compareMethods(A, n, power);
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
function generateMatrix(n, matrixType) {
    const A = new Float64Array(n * n);

    switch (matrixType) {
        case 'random':
            for (let i = 0; i < n * n; i++) {
                A[i] = (Math.random() * 2 - 1) * 0.5; // Scale down to avoid overflow
            }
            break;

        case 'stochastic':
            // Row-stochastic matrix (rows sum to 1)
            for (let i = 0; i < n; i++) {
                let rowSum = 0;
                for (let j = 0; j < n; j++) {
                    A[i * n + j] = Math.random();
                    rowSum += A[i * n + j];
                }
                for (let j = 0; j < n; j++) {
                    A[i * n + j] /= rowSum;
                }
            }
            break;

        case 'nilpotent':
            // Strictly upper triangular (nilpotent)
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    A[i * n + j] = Math.random() * 2 - 1;
                }
            }
            break;

        case 'orthogonal':
            // Generate orthogonal matrix via Gram-Schmidt
            for (let i = 0; i < n * n; i++) {
                A[i] = Math.random() - 0.5;
            }
            // Gram-Schmidt orthogonalization
            for (let j = 0; j < n; j++) {
                for (let k = 0; k < j; k++) {
                    let dot = 0;
                    for (let i = 0; i < n; i++) {
                        dot += A[i * n + j] * A[i * n + k];
                    }
                    for (let i = 0; i < n; i++) {
                        A[i * n + j] -= dot * A[i * n + k];
                    }
                }
                let norm = 0;
                for (let i = 0; i < n; i++) {
                    norm += A[i * n + j] * A[i * n + j];
                }
                norm = Math.sqrt(norm);
                if (norm > 1e-10) {
                    for (let i = 0; i < n; i++) {
                        A[i * n + j] /= norm;
                    }
                }
            }
            break;

        case 'diagonal':
            for (let i = 0; i < n; i++) {
                A[i * n + i] = Math.random() * 2; // Positive diagonal
            }
            break;

        default:
            for (let i = 0; i < n * n; i++) {
                A[i] = Math.random() * 2 - 1;
            }
    }

    return A;
}

// Matrix multiplication C = A * B
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

// Identity matrix
function identity(n) {
    const I = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        I[i * n + i] = 1;
    }
    return I;
}

// Frobenius norm
function frobeniusNorm(A) {
    let sum = 0;
    for (let i = 0; i < A.length; i++) {
        sum += A[i] * A[i];
    }
    return Math.sqrt(sum);
}

// Matrix copy
function matCopy(A) {
    return new Float64Array(A);
}

/**
 * Binary exponentiation (fast power)
 * A^n in O(log n) matrix multiplications
 */
function binaryPower(A, n, power) {
    if (power === 0) {
        return identity(n);
    }

    let result = identity(n);
    let base = matCopy(A);
    let p = power;
    let multiplications = 0;

    const totalBits = Math.floor(Math.log2(power)) + 1;
    let bitCount = 0;

    while (p > 0) {
        if (p & 1) {
            result = matMul(result, base, n);
            multiplications++;
        }
        p >>= 1;
        if (p > 0) {
            base = matMul(base, base, n);
            multiplications++;
        }
        bitCount++;
        reportProgress(10 + 80 * bitCount / totalBits);
    }

    return { result, multiplications };
}

function computeBinaryPower(A, n, power) {
    reportProgress(10);

    const startTime = performance.now();
    const { result, multiplications } = binaryPower(A, n, power);
    const execTime = performance.now() - startTime;

    reportProgress(100);

    return {
        algorithm: 'Binary Exponentiation',
        description: 'Square-and-multiply in O(log n) multiplications',
        matrixSize: n,
        power,
        multiplications,
        resultNorm: frobeniusNorm(result),
        executionTime: execTime,
        submatrix: getSubmatrix(result, n),
        inputSubmatrix: getSubmatrix(A, n)
    };
}

/**
 * Naive repeated multiplication
 * A^n in O(n) matrix multiplications
 */
function naivePower(A, n, power) {
    if (power === 0) {
        return identity(n);
    }

    let result = matCopy(A);
    for (let i = 1; i < power; i++) {
        result = matMul(result, A, n);
        if (i % 10 === 0) {
            reportProgress(10 + 80 * i / power);
        }
    }

    return result;
}

function computeNaivePower(A, n, power) {
    reportProgress(10);

    // Limit naive method to avoid too long computation
    if (power > 1000 && n > 50) {
        throw new Error('Naive method too slow for power > 1000 with large matrices');
    }

    const startTime = performance.now();
    const result = naivePower(A, n, power);
    const execTime = performance.now() - startTime;

    reportProgress(100);

    return {
        algorithm: 'Naive Repeated Multiplication',
        description: 'Direct A × A × ... × A multiplication',
        matrixSize: n,
        power,
        multiplications: power > 0 ? power - 1 : 0,
        resultNorm: frobeniusNorm(result),
        executionTime: execTime,
        submatrix: getSubmatrix(result, n),
        inputSubmatrix: getSubmatrix(A, n)
    };
}

/**
 * Diagonalization method (for symmetric/diagonalizable matrices)
 * A = PDP⁻¹ => A^n = PD^nP⁻¹
 */
function diagPower(A, n, power) {
    // Use Jacobi eigenvalue algorithm for symmetric matrices
    const V = identity(n);
    const D = matCopy(A);

    // Check if symmetric
    let isSymmetric = true;
    for (let i = 0; i < n && isSymmetric; i++) {
        for (let j = i + 1; j < n && isSymmetric; j++) {
            if (Math.abs(D[i * n + j] - D[j * n + i]) > 1e-10) {
                isSymmetric = false;
            }
        }
    }

    if (!isSymmetric) {
        throw new Error('Diagonalization method requires symmetric matrix');
    }

    // Jacobi iterations
    const maxIter = 50;
    for (let sweep = 0; sweep < maxIter; sweep++) {
        reportProgress(10 + 40 * sweep / maxIter);

        let converged = true;
        for (let i = 0; i < n - 1; i++) {
            for (let j = i + 1; j < n; j++) {
                if (Math.abs(D[i * n + j]) < 1e-14) continue;
                converged = false;

                const theta = (D[j * n + j] - D[i * n + i]) / (2 * D[i * n + j]);
                const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(1 + theta * theta));
                const c = 1 / Math.sqrt(1 + t * t);
                const s = t * c;

                // Apply rotation to D
                const dii = D[i * n + i];
                const djj = D[j * n + j];
                const dij = D[i * n + j];
                D[i * n + i] = dii - t * dij;
                D[j * n + j] = djj + t * dij;
                D[i * n + j] = 0;
                D[j * n + i] = 0;

                for (let k = 0; k < n; k++) {
                    if (k !== i && k !== j) {
                        const dki = D[k * n + i];
                        const dkj = D[k * n + j];
                        D[k * n + i] = c * dki - s * dkj;
                        D[i * n + k] = D[k * n + i];
                        D[k * n + j] = s * dki + c * dkj;
                        D[j * n + k] = D[k * n + j];
                    }
                }

                // Update V
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

    // Compute D^n (diagonal)
    const Dn = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        Dn[i * n + i] = Math.pow(D[i * n + i], power);
    }

    reportProgress(75);

    // Compute V * D^n * V^T (since V is orthogonal, V⁻¹ = V^T)
    const VDn = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            VDn[i * n + j] = V[i * n + j] * Dn[j * n + j];
        }
    }

    const result = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += VDn[i * n + k] * V[j * n + k]; // V^T
            }
            result[i * n + j] = sum;
        }
    }

    // Extract eigenvalues
    const eigenvalues = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        eigenvalues[i] = D[i * n + i];
    }

    return { result, eigenvalues };
}

function computeDiagPower(A, n, power) {
    reportProgress(10);

    const startTime = performance.now();
    const { result, eigenvalues } = diagPower(A, n, power);
    const execTime = performance.now() - startTime;

    reportProgress(100);

    return {
        algorithm: 'Eigenvalue Diagonalization',
        description: 'A^n = VD^nV^T for symmetric matrices',
        matrixSize: n,
        power,
        eigenvalues: eigenvalues.slice(0, Math.min(5, n)),
        resultNorm: frobeniusNorm(result),
        executionTime: execTime,
        submatrix: getSubmatrix(result, n),
        inputSubmatrix: getSubmatrix(A, n)
    };
}

function compareMethods(A, n, power) {
    const comparison = [];

    // Binary exponentiation
    reportProgress(5);
    let startTime = performance.now();
    const { result: binResult, multiplications } = binaryPower(A, n, power);
    let binTime = performance.now() - startTime;

    comparison.push({
        method: 'Binary Exp.',
        time: binTime.toFixed(2),
        multiplications,
        norm: frobeniusNorm(binResult).toExponential(3)
    });

    // Naive (only if power is small enough)
    reportProgress(40);
    if (power <= 100) {
        startTime = performance.now();
        const naiveResult = naivePower(A, n, power);
        let naiveTime = performance.now() - startTime;

        // Compare results
        const diff = new Float64Array(n * n);
        for (let i = 0; i < n * n; i++) {
            diff[i] = naiveResult[i] - binResult[i];
        }
        const diffNorm = frobeniusNorm(diff) / frobeniusNorm(binResult);

        comparison.push({
            method: 'Naive',
            time: naiveTime.toFixed(2),
            multiplications: power - 1,
            norm: frobeniusNorm(naiveResult).toExponential(3),
            diff: diffNorm.toExponential(2)
        });
    } else {
        comparison.push({
            method: 'Naive',
            time: 'Skipped',
            multiplications: '-',
            norm: '-',
            diff: '-'
        });
    }

    // Diagonalization (only for symmetric)
    reportProgress(70);
    let isSymmetric = true;
    for (let i = 0; i < n && isSymmetric; i++) {
        for (let j = i + 1; j < n && isSymmetric; j++) {
            if (Math.abs(A[i * n + j] - A[j * n + i]) > 1e-10) {
                isSymmetric = false;
            }
        }
    }

    if (isSymmetric) {
        startTime = performance.now();
        const { result: diagResult } = diagPower(A, n, power);
        let diagTime = performance.now() - startTime;

        const diff = new Float64Array(n * n);
        for (let i = 0; i < n * n; i++) {
            diff[i] = diagResult[i] - binResult[i];
        }
        const diffNorm = frobeniusNorm(diff) / frobeniusNorm(binResult);

        comparison.push({
            method: 'Diagonalization',
            time: diagTime.toFixed(2),
            multiplications: 'O(n³)',
            norm: frobeniusNorm(diagResult).toExponential(3),
            diff: diffNorm.toExponential(2)
        });
    } else {
        comparison.push({
            method: 'Diagonalization',
            time: 'N/A',
            multiplications: '-',
            norm: '-',
            diff: 'Not symmetric'
        });
    }

    reportProgress(100);

    return {
        algorithm: 'Method Comparison',
        description: 'Comparing matrix power algorithms',
        matrixSize: n,
        power,
        comparison,
        submatrix: getSubmatrix(binResult, n),
        inputSubmatrix: getSubmatrix(A, n)
    };
}

function getSubmatrix(A, n) {
    const displaySize = Math.min(5, n);
    const submatrix = [];
    for (let i = 0; i < displaySize; i++) {
        const row = [];
        for (let j = 0; j < displaySize; j++) {
            row.push(A[i * n + j]);
        }
        submatrix.push(row);
    }
    return submatrix;
}
