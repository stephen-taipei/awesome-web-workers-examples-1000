/**
 * Web Worker: Matrix Trace
 * Simple trace, properties analysis, powers, and product trace
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'trace':
                result = simpleTrace(data.matrix);
                break;
            case 'properties':
                result = traceWithProperties(data.matrix);
                break;
            case 'powers':
                result = tracePowers(data.matrix, data.maxPower);
                break;
            case 'product':
                result = traceProduct(data.matrixA, data.matrixB);
                break;
            default:
                throw new Error('Unknown operation type');
        }

        const executionTime = (performance.now() - startTime).toFixed(2);
        self.postMessage({ type: 'result', operation: type, result, executionTime });
    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};

/**
 * Simple Trace Calculation
 */
function simpleTrace(A) {
    const n = A.length;

    if (n !== A[0].length) {
        throw new Error('Trace requires a square matrix');
    }

    self.postMessage({ type: 'progress', percentage: 20 });

    let trace = 0;
    const diagonalElements = [];

    for (let i = 0; i < n; i++) {
        trace += A[i][i];
        diagonalElements.push(A[i][i]);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        operation: 'Simple Trace',
        complexity: 'O(n)',
        trace: trace,
        matrixSize: n,
        diagonalElements: diagonalElements.slice(0, 20), // First 20
        description: 'Sum of diagonal elements: tr(A) = Σ a_ii'
    };
}

/**
 * Trace with Matrix Properties Analysis
 */
function traceWithProperties(A) {
    const n = A.length;

    if (n !== A[0].length) {
        throw new Error('Trace requires a square matrix');
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // Calculate trace
    let trace = 0;
    for (let i = 0; i < n; i++) {
        trace += A[i][i];
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    // Calculate related values
    const properties = [];

    // Frobenius norm squared (tr(A^T * A))
    let frobeniusSquared = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            frobeniusSquared += A[i][j] * A[i][j];
        }
    }
    properties.push({
        name: 'Frobenius Norm',
        value: Math.sqrt(frobeniusSquared),
        formula: '||A||_F = √tr(A^T A)'
    });

    self.postMessage({ type: 'progress', percentage: 50 });

    // Check if symmetric
    let isSymmetric = true;
    for (let i = 0; i < n && isSymmetric; i++) {
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(A[i][j] - A[j][i]) > 1e-10) {
                isSymmetric = false;
                break;
            }
        }
    }

    // tr(A^2)
    const traceA2 = traceOfProduct(A, A);

    self.postMessage({ type: 'progress', percentage: 70 });

    // Check special matrix types
    const specialTypes = [];

    // Identity check
    let isIdentity = true;
    for (let i = 0; i < n && isIdentity; i++) {
        for (let j = 0; j < n; j++) {
            const expected = i === j ? 1 : 0;
            if (Math.abs(A[i][j] - expected) > 1e-10) {
                isIdentity = false;
                break;
            }
        }
    }
    if (isIdentity) specialTypes.push('Identity');

    // Diagonal check
    let isDiagonal = true;
    for (let i = 0; i < n && isDiagonal; i++) {
        for (let j = 0; j < n; j++) {
            if (i !== j && Math.abs(A[i][j]) > 1e-10) {
                isDiagonal = false;
                break;
            }
        }
    }
    if (isDiagonal && !isIdentity) specialTypes.push('Diagonal');

    // Idempotent check (A^2 = A)
    const A2 = multiplyMatrices(A, A);
    let isIdempotent = true;
    for (let i = 0; i < n && isIdempotent; i++) {
        for (let j = 0; j < n; j++) {
            if (Math.abs(A2[i][j] - A[i][j]) > 1e-10) {
                isIdempotent = false;
                break;
            }
        }
    }
    if (isIdempotent) specialTypes.push('Idempotent (A² = A)');

    // Nilpotent check (tr(A) = 0 for nilpotent)
    if (Math.abs(trace) < 1e-10 && Math.abs(traceA2) < 1e-10) {
        specialTypes.push('Possibly Nilpotent');
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        operation: 'Trace with Properties',
        complexity: 'O(n²)',
        trace: trace,
        traceSquared: traceA2,
        matrixSize: n,
        properties: properties,
        isSymmetric: isSymmetric,
        specialTypes: specialTypes,
        frobeniusNorm: Math.sqrt(frobeniusSquared),
        description: 'Trace along with related matrix properties'
    };
}

/**
 * Trace of Matrix Powers: tr(A), tr(A²), tr(A³), ...
 */
function tracePowers(A, maxPower = 5) {
    const n = A.length;

    if (n !== A[0].length) {
        throw new Error('Trace requires a square matrix');
    }

    if (maxPower > 20) {
        throw new Error('Maximum power limited to 20');
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    const traces = [];
    let currentPower = A.map(row => [...row]); // A^1

    for (let p = 1; p <= maxPower; p++) {
        // Calculate trace of current power
        let trace = 0;
        for (let i = 0; i < n; i++) {
            trace += currentPower[i][i];
        }
        traces.push({ power: p, trace: trace });

        // Calculate next power if needed
        if (p < maxPower) {
            currentPower = multiplyMatrices(currentPower, A);
        }

        self.postMessage({
            type: 'progress',
            percentage: 10 + Math.round((p / maxPower) * 80)
        });
    }

    // Newton's identities: relate power sums to elementary symmetric polynomials
    // p_k = sum of k-th powers of eigenvalues = tr(A^k)

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        operation: 'Trace of Powers',
        complexity: 'O(k × n³)',
        traces: traces,
        matrixSize: n,
        maxPower: maxPower,
        note: 'tr(A^k) = sum of k-th powers of eigenvalues (Newton\'s identities)',
        description: 'Traces of consecutive matrix powers'
    };
}

/**
 * Trace of Matrix Product: tr(AB)
 */
function traceProduct(A, B) {
    const n = A.length;

    if (n !== A[0].length || n !== B.length || n !== B[0].length) {
        throw new Error('Both matrices must be square and same size');
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    // Calculate tr(AB) efficiently without computing full product
    // tr(AB) = Σ_i Σ_j A[i][j] * B[j][i]
    let traceAB = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            traceAB += A[i][j] * B[j][i];
        }

        if (i % Math.floor(n / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((i / n) * 30)
            });
        }
    }

    self.postMessage({ type: 'progress', percentage: 50 });

    // Calculate tr(BA) - should equal tr(AB)
    let traceBA = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            traceBA += B[i][j] * A[j][i];
        }
    }

    self.postMessage({ type: 'progress', percentage: 70 });

    // Calculate individual traces
    let traceA = 0, traceB = 0;
    for (let i = 0; i < n; i++) {
        traceA += A[i][i];
        traceB += B[i][i];
    }

    // Verify cyclic property
    const cyclicVerified = Math.abs(traceAB - traceBA) < 1e-10;

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        operation: 'Trace of Product',
        complexity: 'O(n²)',
        traceAB: traceAB,
        traceBA: traceBA,
        traceA: traceA,
        traceB: traceB,
        matrixSize: n,
        cyclicVerified: cyclicVerified,
        relationships: [
            { formula: 'tr(AB)', value: traceAB },
            { formula: 'tr(BA)', value: traceBA },
            { formula: 'tr(A) + tr(B)', value: traceA + traceB },
            { formula: 'tr(A) × tr(B)', value: traceA * traceB }
        ],
        description: 'tr(AB) = tr(BA) demonstrates cyclic property of trace'
    };
}

// ========== Helper Functions ==========

function multiplyMatrices(A, B) {
    const n = A.length;
    const C = [];
    for (let i = 0; i < n; i++) {
        C[i] = new Array(n).fill(0);
        for (let j = 0; j < n; j++) {
            for (let k = 0; k < n; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
    return C;
}

function traceOfProduct(A, B) {
    const n = A.length;
    let trace = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            trace += A[i][j] * B[j][i];
        }
    }
    return trace;
}
