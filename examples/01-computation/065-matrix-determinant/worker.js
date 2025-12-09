/**
 * Web Worker: Matrix Determinant
 * LU Decomposition, Cofactor Expansion, and Bareiss algorithms
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'lu':
                result = luDeterminant(data.matrix);
                break;
            case 'cofactor':
                result = cofactorDeterminant(data.matrix);
                break;
            case 'bareiss':
                result = bareissDeterminant(data.matrix);
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
 * LU Decomposition Method - O(n³)
 * Most efficient for general matrices
 */
function luDeterminant(A) {
    const n = A.length;

    if (n !== A[0].length) {
        throw new Error('Determinant requires a square matrix');
    }

    // Create a copy for LU decomposition
    const U = A.map(row => [...row]);
    let det = 1;
    let swaps = 0;

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let k = 0; k < n - 1; k++) {
        // Partial pivoting
        let maxVal = Math.abs(U[k][k]);
        let maxRow = k;

        for (let i = k + 1; i < n; i++) {
            if (Math.abs(U[i][k]) > maxVal) {
                maxVal = Math.abs(U[i][k]);
                maxRow = i;
            }
        }

        // Swap rows if needed
        if (maxRow !== k) {
            [U[k], U[maxRow]] = [U[maxRow], U[k]];
            swaps++;
        }

        // Check for zero pivot (singular matrix)
        if (Math.abs(U[k][k]) < 1e-14) {
            self.postMessage({ type: 'progress', percentage: 100 });
            return {
                algorithm: 'LU Decomposition',
                complexity: 'O(n³)',
                determinant: 0,
                isSingular: true,
                matrixSize: n,
                swaps: swaps,
                description: 'Matrix is singular (det = 0)'
            };
        }

        // Gaussian elimination
        for (let i = k + 1; i < n; i++) {
            const factor = U[i][k] / U[k][k];
            for (let j = k; j < n; j++) {
                U[i][j] -= factor * U[k][j];
            }
        }

        if (k % Math.floor(n / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((k / n) * 80)
            });
        }
    }

    // Calculate determinant as product of diagonal elements
    for (let i = 0; i < n; i++) {
        det *= U[i][i];
    }

    // Adjust sign for row swaps
    if (swaps % 2 === 1) {
        det = -det;
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Analyze properties
    const properties = analyzeProperties(A, det);

    return {
        algorithm: 'LU Decomposition',
        complexity: 'O(n³)',
        determinant: det,
        isSingular: Math.abs(det) < 1e-10,
        matrixSize: n,
        swaps: swaps,
        properties: properties,
        description: 'Uses Gaussian elimination with partial pivoting'
    };
}

/**
 * Cofactor Expansion (Laplace Expansion) - O(n!)
 * Only practical for small matrices
 */
function cofactorDeterminant(A) {
    const n = A.length;

    if (n !== A[0].length) {
        throw new Error('Determinant requires a square matrix');
    }

    if (n > 10) {
        throw new Error('Cofactor expansion is too slow for matrices larger than 10×10');
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    let operations = 0;
    const det = cofactorExpand(A, 0, n, (ops) => {
        operations = ops;
        if (ops % 1000 === 0) {
            self.postMessage({
                type: 'progress',
                percentage: Math.min(90, 10 + Math.round((ops / factorial(n)) * 80))
            });
        }
    });

    self.postMessage({ type: 'progress', percentage: 100 });

    const properties = analyzeProperties(A, det);

    return {
        algorithm: 'Cofactor Expansion',
        complexity: 'O(n!)',
        determinant: det,
        isSingular: Math.abs(det) < 1e-10,
        matrixSize: n,
        operations: operations,
        properties: properties,
        description: 'Recursive expansion along first row (Laplace expansion)'
    };
}

function cofactorExpand(A, depth, maxDepth, reportOps) {
    const n = A.length;

    if (n === 1) {
        reportOps(1);
        return A[0][0];
    }

    if (n === 2) {
        reportOps(1);
        return A[0][0] * A[1][1] - A[0][1] * A[1][0];
    }

    let det = 0;
    let ops = 0;

    for (let j = 0; j < n; j++) {
        // Create minor matrix
        const minor = [];
        for (let i = 1; i < n; i++) {
            const row = [];
            for (let k = 0; k < n; k++) {
                if (k !== j) {
                    row.push(A[i][k]);
                }
            }
            minor.push(row);
        }

        const sign = (j % 2 === 0) ? 1 : -1;
        const cofactor = sign * A[0][j] * cofactorExpand(minor, depth + 1, maxDepth, reportOps);
        det += cofactor;
        ops++;
    }

    reportOps(ops);
    return det;
}

/**
 * Bareiss Algorithm - O(n³) with integer arithmetic
 * Avoids fractions during computation
 */
function bareissDeterminant(A) {
    const n = A.length;

    if (n !== A[0].length) {
        throw new Error('Determinant requires a square matrix');
    }

    // Check if all values are integers (or close to)
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (Math.abs(A[i][j] - Math.round(A[i][j])) > 1e-10) {
                throw new Error('Bareiss algorithm works best with integer matrices');
            }
        }
    }

    // Create a copy
    const M = A.map(row => row.map(v => Math.round(v)));
    let sign = 1;

    self.postMessage({ type: 'progress', percentage: 10 });

    for (let k = 0; k < n - 1; k++) {
        // Partial pivoting
        if (M[k][k] === 0) {
            let found = false;
            for (let i = k + 1; i < n; i++) {
                if (M[i][k] !== 0) {
                    [M[k], M[i]] = [M[i], M[k]];
                    sign *= -1;
                    found = true;
                    break;
                }
            }
            if (!found) {
                self.postMessage({ type: 'progress', percentage: 100 });
                return {
                    algorithm: 'Bareiss Algorithm',
                    complexity: 'O(n³)',
                    determinant: 0,
                    isSingular: true,
                    matrixSize: n,
                    description: 'Matrix is singular (det = 0)'
                };
            }
        }

        const prev = k > 0 ? M[k-1][k-1] : 1;

        for (let i = k + 1; i < n; i++) {
            for (let j = k + 1; j < n; j++) {
                M[i][j] = (M[i][j] * M[k][k] - M[i][k] * M[k][j]) / prev;
            }
        }

        if (k % Math.floor(n / 10) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((k / n) * 80)
            });
        }
    }

    const det = sign * M[n-1][n-1];

    self.postMessage({ type: 'progress', percentage: 100 });

    const properties = analyzeProperties(A, det);

    return {
        algorithm: 'Bareiss Algorithm',
        complexity: 'O(n³)',
        determinant: det,
        isSingular: det === 0,
        matrixSize: n,
        isExact: true,
        properties: properties,
        description: 'Division-free algorithm maintaining integer arithmetic'
    };
}

/**
 * Compare all algorithms
 */
function compareAlgorithms(A) {
    const n = A.length;
    const results = [];

    self.postMessage({ type: 'progress', percentage: 10 });

    // LU Decomposition
    const luStart = performance.now();
    const luResult = luDeterminant(A);
    const luTime = performance.now() - luStart;
    results.push({
        algorithm: 'LU Decomposition',
        determinant: luResult.determinant,
        time: luTime.toFixed(2),
        complexity: 'O(n³)'
    });

    self.postMessage({ type: 'progress', percentage: 40 });

    // Cofactor (only for small matrices)
    if (n <= 10) {
        const cofactorStart = performance.now();
        const cofactorResult = cofactorDeterminant(A);
        const cofactorTime = performance.now() - cofactorStart;
        results.push({
            algorithm: 'Cofactor',
            determinant: cofactorResult.determinant,
            time: cofactorTime.toFixed(2),
            complexity: 'O(n!)'
        });
    }

    self.postMessage({ type: 'progress', percentage: 70 });

    // Bareiss (if integer matrix)
    let isInteger = true;
    for (let i = 0; i < n && isInteger; i++) {
        for (let j = 0; j < n; j++) {
            if (Math.abs(A[i][j] - Math.round(A[i][j])) > 1e-10) {
                isInteger = false;
                break;
            }
        }
    }

    if (isInteger) {
        const bareissStart = performance.now();
        const bareissResult = bareissDeterminant(A);
        const bareissTime = performance.now() - bareissStart;
        results.push({
            algorithm: 'Bareiss',
            determinant: bareissResult.determinant,
            time: bareissTime.toFixed(2),
            complexity: 'O(n³)'
        });
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Verify results match (within tolerance)
    const epsilon = 1e-8;
    let allMatch = true;
    for (let i = 1; i < results.length; i++) {
        if (Math.abs(results[i].determinant - results[0].determinant) > epsilon * Math.max(1, Math.abs(results[0].determinant))) {
            allMatch = false;
            break;
        }
    }

    return {
        algorithm: 'Algorithm Comparison',
        determinant: luResult.determinant,
        isSingular: luResult.isSingular,
        matrixSize: n,
        comparison: results,
        allMatch: allMatch,
        properties: luResult.properties,
        description: 'Performance comparison of determinant algorithms'
    };
}

/**
 * Analyze matrix properties based on determinant
 */
function analyzeProperties(A, det) {
    const n = A.length;
    const properties = [];
    const epsilon = 1e-10;

    // Singular check
    if (Math.abs(det) < epsilon) {
        properties.push({
            name: 'Singular',
            value: 'det = 0, not invertible',
            icon: '⚠'
        });
    } else {
        properties.push({
            name: 'Invertible',
            value: 'det ≠ 0',
            icon: '✓'
        });
    }

    // Check if det = 1 (special orthogonal)
    if (Math.abs(Math.abs(det) - 1) < epsilon) {
        properties.push({
            name: '|det| = 1',
            value: 'Volume preserving',
            icon: '✓'
        });
    }

    // Check sign
    if (det > epsilon) {
        properties.push({
            name: 'Positive',
            value: 'det > 0',
            icon: '+'
        });
    } else if (det < -epsilon) {
        properties.push({
            name: 'Negative',
            value: 'det < 0',
            icon: '-'
        });
    }

    // Check if diagonal matrix (det = product of diagonal)
    let isDiagonal = true;
    let diagProduct = 1;
    for (let i = 0; i < n && isDiagonal; i++) {
        diagProduct *= A[i][i];
        for (let j = 0; j < n; j++) {
            if (i !== j && Math.abs(A[i][j]) > epsilon) {
                isDiagonal = false;
                break;
            }
        }
    }
    if (isDiagonal && Math.abs(det - diagProduct) < epsilon) {
        properties.push({
            name: 'Diagonal',
            value: 'det = product of diagonal',
            icon: '▦'
        });
    }

    // Check if upper/lower triangular
    let isUpperTriangular = true;
    let isLowerTriangular = true;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < i; j++) {
            if (Math.abs(A[i][j]) > epsilon) isUpperTriangular = false;
        }
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(A[i][j]) > epsilon) isLowerTriangular = false;
        }
    }
    if (isUpperTriangular && !isDiagonal) {
        properties.push({
            name: 'Upper Triangular',
            value: 'det = product of diagonal',
            icon: '△'
        });
    }
    if (isLowerTriangular && !isDiagonal) {
        properties.push({
            name: 'Lower Triangular',
            value: 'det = product of diagonal',
            icon: '▽'
        });
    }

    return properties;
}

function factorial(n) {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}
