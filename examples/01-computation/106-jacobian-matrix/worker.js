/**
 * Web Worker for Jacobian Matrix Computation
 * Compute the matrix of partial derivatives for vector-valued functions
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, point, h, method } = data;

        // Create vector function
        const F = createVectorFunction(functionType, customFunction);
        const exactJacobian = getExactJacobian(functionType);

        reportProgress(10);

        // Evaluate function at point
        const fValue = F(point);
        const m = fValue.length;  // Output dimension
        const n = point.length;   // Input dimension

        reportProgress(30);

        // Compute Jacobian matrix
        const jacobian = computeJacobian(F, point, m, n, h, method);

        reportProgress(60);

        // Calculate exact Jacobian if available
        let exact = null;
        if (exactJacobian) {
            exact = exactJacobian(point);
        }

        // Compute matrix properties
        const determinant = m === n ? computeDeterminant(jacobian) : null;
        const rank = estimateRank(jacobian);
        const singularValues = m <= 3 && n <= 3 ? estimateSingularValues(jacobian) : null;

        reportProgress(80);

        // Compute condition number if square
        let conditionNumber = null;
        if (singularValues && singularValues.length > 0) {
            const maxSV = Math.max(...singularValues);
            const minSV = Math.min(...singularValues.filter(s => s > 1e-10));
            if (minSV > 0) conditionNumber = maxSV / minSV;
        }

        // Frobenius norm
        const frobeniusNorm = Math.sqrt(
            jacobian.reduce((sum, row) =>
                sum + row.reduce((s, val) => s + val * val, 0), 0)
        );

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                fValue,
                jacobian,
                exact,
                determinant,
                rank,
                singularValues,
                conditionNumber,
                frobeniusNorm,
                dimensions: { m, n },
                functionStrings: getFunctionStrings(functionType),
                point, h, method
            },
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

function createVectorFunction(functionType, customFunction) {
    switch (functionType) {
        case 'polar':
            // (r, θ) -> (x, y) = (r·cos(θ), r·sin(θ))
            return x => [x[0] * Math.cos(x[1]), x[0] * Math.sin(x[1])];

        case 'spherical':
            // (r, θ, φ) -> (x, y, z)
            return x => [
                x[0] * Math.sin(x[1]) * Math.cos(x[2]),
                x[0] * Math.sin(x[1]) * Math.sin(x[2]),
                x[0] * Math.cos(x[1])
            ];

        case 'rotation':
            // (x, y, θ) -> rotated (x', y')
            return x => [
                x[0] * Math.cos(x[2]) - x[1] * Math.sin(x[2]),
                x[0] * Math.sin(x[2]) + x[1] * Math.cos(x[2])
            ];

        case 'nonlinear':
            // (x, y) -> (x² + y, xy + y²)
            return x => [x[0] * x[0] + x[1], x[0] * x[1] + x[1] * x[1]];

        case 'trig':
            // (x, y) -> (sin(x)cos(y), cos(x)sin(y))
            return x => [
                Math.sin(x[0]) * Math.cos(x[1]),
                Math.cos(x[0]) * Math.sin(x[1])
            ];

        case 'newton':
            // System for Newton's method: x² + y² = 4, xy = 1
            return x => [x[0] * x[0] + x[1] * x[1] - 4, x[0] * x[1] - 1];

        case 'lorentz':
            // Lorentz system at a point (simplified for Jacobian demo)
            const sigma = 10, rho = 28, beta = 8/3;
            return x => [
                sigma * (x[1] - x[0]),
                x[0] * (rho - x[2]) - x[1],
                x[0] * x[1] - beta * x[2]
            ];

        case 'custom':
            try {
                return new Function('x', `return ${customFunction};`);
            } catch (e) {
                throw new Error('Invalid custom function: ' + e.message);
            }

        default:
            return x => [x[0] * Math.cos(x[1]), x[0] * Math.sin(x[1])];
    }
}

function getExactJacobian(functionType) {
    switch (functionType) {
        case 'polar':
            return x => [
                [Math.cos(x[1]), -x[0] * Math.sin(x[1])],
                [Math.sin(x[1]), x[0] * Math.cos(x[1])]
            ];

        case 'nonlinear':
            return x => [
                [2 * x[0], 1],
                [x[1], x[0] + 2 * x[1]]
            ];

        case 'trig':
            return x => [
                [Math.cos(x[0]) * Math.cos(x[1]), -Math.sin(x[0]) * Math.sin(x[1])],
                [-Math.sin(x[0]) * Math.sin(x[1]), Math.cos(x[0]) * Math.cos(x[1])]
            ];

        case 'newton':
            return x => [
                [2 * x[0], 2 * x[1]],
                [x[1], x[0]]
            ];

        default:
            return null;
    }
}

function getFunctionStrings(functionType) {
    switch (functionType) {
        case 'polar':
            return { name: 'Polar → Cartesian', components: ['r·cos(θ)', 'r·sin(θ)'] };
        case 'spherical':
            return { name: 'Spherical → Cartesian', components: ['r·sin(θ)·cos(φ)', 'r·sin(θ)·sin(φ)', 'r·cos(θ)'] };
        case 'rotation':
            return { name: '2D Rotation', components: ['x·cos(θ) - y·sin(θ)', 'x·sin(θ) + y·cos(θ)'] };
        case 'nonlinear':
            return { name: 'Nonlinear System', components: ['x² + y', 'xy + y²'] };
        case 'trig':
            return { name: 'Trig System', components: ['sin(x)·cos(y)', 'cos(x)·sin(y)'] };
        case 'newton':
            return { name: 'Newton System', components: ['x² + y² - 4', 'xy - 1'] };
        case 'lorentz':
            return { name: 'Lorentz System', components: ['σ(y-x)', 'x(ρ-z)-y', 'xy-βz'] };
        default:
            return { name: 'F(x)', components: ['f₁', 'f₂'] };
    }
}

function computeJacobian(F, point, m, n, h, method) {
    const J = Array(m).fill(null).map(() => Array(n).fill(0));

    for (let j = 0; j < n; j++) {
        const xp = [...point];
        const xm = [...point];

        if (method === 'central') {
            xp[j] += h;
            xm[j] -= h;
            const fp = F(xp);
            const fm = F(xm);
            for (let i = 0; i < m; i++) {
                J[i][j] = (fp[i] - fm[i]) / (2 * h);
            }
        } else {
            xp[j] += h;
            const fp = F(xp);
            const f0 = F(point);
            for (let i = 0; i < m; i++) {
                J[i][j] = (fp[i] - f0[i]) / h;
            }
        }
    }

    return J;
}

function computeDeterminant(J) {
    const n = J.length;
    if (n !== J[0].length) return null;

    if (n === 2) {
        return J[0][0] * J[1][1] - J[0][1] * J[1][0];
    } else if (n === 3) {
        return J[0][0] * (J[1][1] * J[2][2] - J[1][2] * J[2][1]) -
               J[0][1] * (J[1][0] * J[2][2] - J[1][2] * J[2][0]) +
               J[0][2] * (J[1][0] * J[2][1] - J[1][1] * J[2][0]);
    }

    // LU decomposition for larger
    return luDeterminant(J);
}

function luDeterminant(A) {
    const n = A.length;
    const M = A.map(row => [...row]);
    let det = 1;

    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
        }
        if (maxRow !== i) {
            [M[i], M[maxRow]] = [M[maxRow], M[i]];
            det *= -1;
        }
        if (Math.abs(M[i][i]) < 1e-12) return 0;
        det *= M[i][i];
        for (let k = i + 1; k < n; k++) {
            const factor = M[k][i] / M[i][i];
            for (let j = i; j < n; j++) {
                M[k][j] -= factor * M[i][j];
            }
        }
    }
    return det;
}

function estimateRank(J) {
    const m = J.length;
    const n = J[0].length;
    const A = J.map(row => [...row]);
    const tol = 1e-10;
    let rank = 0;

    for (let col = 0; col < n && rank < m; col++) {
        // Find pivot
        let maxRow = rank;
        for (let row = rank + 1; row < m; row++) {
            if (Math.abs(A[row][col]) > Math.abs(A[maxRow][col])) {
                maxRow = row;
            }
        }

        if (Math.abs(A[maxRow][col]) < tol) continue;

        [A[rank], A[maxRow]] = [A[maxRow], A[rank]];

        for (let row = rank + 1; row < m; row++) {
            const factor = A[row][col] / A[rank][col];
            for (let j = col; j < n; j++) {
                A[row][j] -= factor * A[rank][j];
            }
        }
        rank++;
    }

    return rank;
}

function estimateSingularValues(J) {
    // For small matrices, compute eigenvalues of J^T J
    const m = J.length;
    const n = J[0].length;

    // Compute J^T J
    const JTJ = Array(n).fill(null).map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            for (let k = 0; k < m; k++) {
                JTJ[i][j] += J[k][i] * J[k][j];
            }
        }
    }

    // Get eigenvalues of J^T J
    const eigenvalues = [];
    if (n === 2) {
        const a = JTJ[0][0], b = JTJ[0][1], d = JTJ[1][1];
        const trace = a + d;
        const det = a * d - b * b;
        const disc = trace * trace - 4 * det;
        if (disc >= 0) {
            eigenvalues.push((trace + Math.sqrt(disc)) / 2);
            eigenvalues.push((trace - Math.sqrt(disc)) / 2);
        }
    }

    // Singular values are sqrt of eigenvalues of J^T J
    return eigenvalues.map(e => Math.sqrt(Math.max(0, e))).sort((a, b) => b - a);
}
