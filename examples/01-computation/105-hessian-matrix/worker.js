/**
 * Web Worker for Hessian Matrix Computation
 * Compute the matrix of second-order partial derivatives
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, customFunction, point, h, method } = data;
        const n = point.length;

        // Create function
        const f = createFunction(functionType, customFunction, n);
        const exactHessian = getExactHessian(functionType);

        reportProgress(10);

        // Calculate function value and gradient at point
        const fValue = f(point);
        const gradient = computeGradient(f, point, h);

        reportProgress(30);

        // Compute Hessian matrix
        const hessian = computeHessian(f, point, h, method);

        reportProgress(60);

        // Calculate exact Hessian if available
        let exact = null;
        if (exactHessian) {
            exact = exactHessian(point);
        }

        // Compute eigenvalues and eigenvectors (for 2D and 3D)
        const eigenAnalysis = computeEigenAnalysis(hessian);

        reportProgress(80);

        // Compute matrix properties
        const determinant = computeDeterminant(hessian);
        const trace = computeTrace(hessian);
        const isSymmetric = checkSymmetry(hessian);

        // Classify critical point
        const classification = classifyCriticalPoint(hessian, gradient, eigenAnalysis);

        // Condition number
        const conditionNumber = eigenAnalysis.eigenvalues.length > 0 ?
            Math.max(...eigenAnalysis.eigenvalues.map(Math.abs)) /
            Math.min(...eigenAnalysis.eigenvalues.map(Math.abs)) : null;

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                fValue,
                gradient,
                hessian,
                exact,
                eigenAnalysis,
                determinant,
                trace,
                isSymmetric,
                classification,
                conditionNumber,
                functionString: getFunctionString(functionType, n),
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

function createFunction(functionType, customFunction, n) {
    switch (functionType) {
        case 'quadratic':
            return x => x.reduce((sum, xi) => sum + xi * xi, 0);

        case 'rosenbrock':
            return x => Math.pow(1 - x[0], 2) + 100 * Math.pow(x[1] - x[0] * x[0], 2);

        case 'himmelblau':
            return x => Math.pow(x[0] * x[0] + x[1] - 11, 2) + Math.pow(x[0] + x[1] * x[1] - 7, 2);

        case 'beale':
            return x => Math.pow(1.5 - x[0] + x[0] * x[1], 2) +
                       Math.pow(2.25 - x[0] + x[0] * x[1] * x[1], 2) +
                       Math.pow(2.625 - x[0] + x[0] * Math.pow(x[1], 3), 2);

        case 'booth':
            return x => Math.pow(x[0] + 2 * x[1] - 7, 2) + Math.pow(2 * x[0] + x[1] - 5, 2);

        case 'matyas':
            return x => 0.26 * (x[0] * x[0] + x[1] * x[1]) - 0.48 * x[0] * x[1];

        case 'sixhump':
            return x => (4 - 2.1 * x[0] * x[0] + Math.pow(x[0], 4) / 3) * x[0] * x[0] +
                       x[0] * x[1] + (-4 + 4 * x[1] * x[1]) * x[1] * x[1];

        case 'custom':
            try {
                return new Function('x', `return ${customFunction};`);
            } catch (e) {
                throw new Error('Invalid custom function: ' + e.message);
            }

        default:
            return x => x.reduce((sum, xi) => sum + xi * xi, 0);
    }
}

function getExactHessian(functionType) {
    switch (functionType) {
        case 'quadratic':
            return x => {
                const n = x.length;
                const H = Array(n).fill(null).map(() => Array(n).fill(0));
                for (let i = 0; i < n; i++) H[i][i] = 2;
                return H;
            };

        case 'rosenbrock':
            return x => {
                const x1 = x[0], x2 = x[1];
                return [
                    [2 - 400 * x2 + 1200 * x1 * x1, -400 * x1],
                    [-400 * x1, 200]
                ];
            };

        case 'booth':
            return x => [[10, 8], [8, 10]];

        case 'matyas':
            return x => [[0.52, -0.48], [-0.48, 0.52]];

        default:
            return null;
    }
}

function getFunctionString(functionType, n) {
    switch (functionType) {
        case 'quadratic': return `Σxᵢ² (n=${n})`;
        case 'rosenbrock': return '(1-x)² + 100(y-x²)²';
        case 'himmelblau': return '(x²+y-11)² + (x+y²-7)²';
        case 'beale': return 'Beale function';
        case 'booth': return '(x+2y-7)² + (2x+y-5)²';
        case 'matyas': return '0.26(x²+y²) - 0.48xy';
        case 'sixhump': return 'Six-Hump Camel';
        default: return 'f(x)';
    }
}

function computeGradient(f, point, h) {
    const n = point.length;
    const gradient = new Array(n);

    for (let i = 0; i < n; i++) {
        const xp = [...point];
        const xm = [...point];
        xp[i] += h;
        xm[i] -= h;
        gradient[i] = (f(xp) - f(xm)) / (2 * h);
    }

    return gradient;
}

function computeHessian(f, point, h, method) {
    const n = point.length;
    const H = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            if (i === j) {
                // Diagonal: ∂²f/∂xᵢ²
                H[i][i] = secondDerivativeDiagonal(f, point, i, h);
            } else {
                // Off-diagonal: ∂²f/∂xᵢ∂xⱼ
                H[i][j] = secondDerivativeMixed(f, point, i, j, h, method);
                H[j][i] = H[i][j]; // Symmetry
            }
        }
    }

    return H;
}

function secondDerivativeDiagonal(f, point, i, h) {
    const xp = [...point];
    const xm = [...point];
    xp[i] += h;
    xm[i] -= h;
    return (f(xp) - 2 * f(point) + f(xm)) / (h * h);
}

function secondDerivativeMixed(f, point, i, j, h, method) {
    if (method === 'forward') {
        const x00 = [...point];
        const x10 = [...point]; x10[i] += h;
        const x01 = [...point]; x01[j] += h;
        const x11 = [...point]; x11[i] += h; x11[j] += h;
        return (f(x11) - f(x10) - f(x01) + f(x00)) / (h * h);
    } else {
        // Central difference
        const xpp = [...point]; xpp[i] += h; xpp[j] += h;
        const xpm = [...point]; xpm[i] += h; xpm[j] -= h;
        const xmp = [...point]; xmp[i] -= h; xmp[j] += h;
        const xmm = [...point]; xmm[i] -= h; xmm[j] -= h;
        return (f(xpp) - f(xpm) - f(xmp) + f(xmm)) / (4 * h * h);
    }
}

function computeEigenAnalysis(H) {
    const n = H.length;

    if (n === 2) {
        return eigenvalues2x2(H);
    } else if (n === 3) {
        return eigenvalues3x3(H);
    } else {
        // For larger matrices, use power iteration for largest eigenvalue
        return { eigenvalues: [], eigenvectors: [], note: 'Full eigen decomposition not implemented for n>3' };
    }
}

function eigenvalues2x2(H) {
    const a = H[0][0], b = H[0][1], c = H[1][0], d = H[1][1];
    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = trace * trace - 4 * det;

    if (discriminant < 0) {
        return { eigenvalues: [], eigenvectors: [], note: 'Complex eigenvalues' };
    }

    const sqrtDisc = Math.sqrt(discriminant);
    const lambda1 = (trace + sqrtDisc) / 2;
    const lambda2 = (trace - sqrtDisc) / 2;

    // Compute eigenvectors
    const eigenvectors = [];
    for (const lambda of [lambda1, lambda2]) {
        if (Math.abs(b) > 1e-10) {
            const v = [b, lambda - a];
            const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
            eigenvectors.push(v.map(x => x / norm));
        } else if (Math.abs(c) > 1e-10) {
            const v = [lambda - d, c];
            const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
            eigenvectors.push(v.map(x => x / norm));
        } else {
            eigenvectors.push(lambda === a ? [1, 0] : [0, 1]);
        }
    }

    return { eigenvalues: [lambda1, lambda2], eigenvectors };
}

function eigenvalues3x3(H) {
    // Characteristic polynomial coefficients for 3x3
    const a = H[0][0], b = H[0][1], c = H[0][2];
    const d = H[1][0], e = H[1][1], f = H[1][2];
    const g = H[2][0], h = H[2][1], i = H[2][2];

    const trace = a + e + i;
    const p1 = b * b + c * c + f * f;
    const q = trace / 3;
    const p2 = (a - q) * (a - q) + (e - q) * (e - q) + (i - q) * (i - q) + 2 * p1;
    const p = Math.sqrt(p2 / 6);

    if (p < 1e-10) {
        return { eigenvalues: [q, q, q], eigenvectors: [], note: 'Multiple eigenvalue' };
    }

    const B = [
        [(a - q) / p, b / p, c / p],
        [d / p, (e - q) / p, f / p],
        [g / p, h / p, (i - q) / p]
    ];

    const detB = B[0][0] * (B[1][1] * B[2][2] - B[1][2] * B[2][1]) -
                 B[0][1] * (B[1][0] * B[2][2] - B[1][2] * B[2][0]) +
                 B[0][2] * (B[1][0] * B[2][1] - B[1][1] * B[2][0]);

    const r = detB / 2;
    const phi = Math.abs(r) >= 1 ? (r > 0 ? 0 : Math.PI / 3) : Math.acos(r) / 3;

    const lambda1 = q + 2 * p * Math.cos(phi);
    const lambda2 = q + 2 * p * Math.cos(phi + 2 * Math.PI / 3);
    const lambda3 = 3 * q - lambda1 - lambda2;

    return { eigenvalues: [lambda1, lambda2, lambda3].sort((a, b) => b - a), eigenvectors: [] };
}

function computeDeterminant(H) {
    const n = H.length;
    if (n === 2) {
        return H[0][0] * H[1][1] - H[0][1] * H[1][0];
    } else if (n === 3) {
        return H[0][0] * (H[1][1] * H[2][2] - H[1][2] * H[2][1]) -
               H[0][1] * (H[1][0] * H[2][2] - H[1][2] * H[2][0]) +
               H[0][2] * (H[1][0] * H[2][1] - H[1][1] * H[2][0]);
    } else {
        // LU decomposition for larger matrices
        return luDeterminant(H);
    }
}

function luDeterminant(H) {
    const n = H.length;
    const A = H.map(row => [...row]);
    let det = 1;

    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
        }
        if (maxRow !== i) {
            [A[i], A[maxRow]] = [A[maxRow], A[i]];
            det *= -1;
        }
        if (Math.abs(A[i][i]) < 1e-12) return 0;
        det *= A[i][i];
        for (let k = i + 1; k < n; k++) {
            const factor = A[k][i] / A[i][i];
            for (let j = i; j < n; j++) {
                A[k][j] -= factor * A[i][j];
            }
        }
    }
    return det;
}

function computeTrace(H) {
    return H.reduce((sum, row, i) => sum + row[i], 0);
}

function checkSymmetry(H) {
    const n = H.length;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(H[i][j] - H[j][i]) > 1e-10) return false;
        }
    }
    return true;
}

function classifyCriticalPoint(H, gradient, eigenAnalysis) {
    const gradNorm = Math.sqrt(gradient.reduce((s, g) => s + g * g, 0));
    const isCritical = gradNorm < 0.1;

    if (!isCritical) {
        return { type: 'not_critical', description: 'Not a critical point (∇f ≠ 0)' };
    }

    const eigenvalues = eigenAnalysis.eigenvalues;
    if (eigenvalues.length === 0) {
        return { type: 'unknown', description: 'Cannot determine (eigenvalue computation failed)' };
    }

    const allPositive = eigenvalues.every(e => e > 1e-10);
    const allNegative = eigenvalues.every(e => e < -1e-10);
    const hasZero = eigenvalues.some(e => Math.abs(e) < 1e-10);
    const hasMixed = eigenvalues.some(e => e > 1e-10) && eigenvalues.some(e => e < -1e-10);

    if (hasZero) {
        return { type: 'degenerate', description: 'Degenerate critical point (test inconclusive)' };
    } else if (allPositive) {
        return { type: 'minimum', description: 'Local minimum (H positive definite)' };
    } else if (allNegative) {
        return { type: 'maximum', description: 'Local maximum (H negative definite)' };
    } else if (hasMixed) {
        return { type: 'saddle', description: 'Saddle point (H indefinite)' };
    }

    return { type: 'unknown', description: 'Cannot classify' };
}
