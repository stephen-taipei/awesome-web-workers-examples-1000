/**
 * Web Worker: Boundary Value Problem Solver
 * Various methods for solving two-point BVPs
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'shooting':
                result = shootingMethod(data.equation, data.a, data.b, data.ya, data.yb, data.n);
                break;
            case 'finiteDifference':
                result = finiteDifferenceMethod(data.equation, data.a, data.b, data.ya, data.yb, data.n);
                break;
            case 'collocation':
                result = collocationMethod(data.equation, data.a, data.b, data.ya, data.yb, data.n);
                break;
            case 'relaxation':
                result = relaxationMethod(data.equation, data.a, data.b, data.ya, data.yb, data.n, data.tolerance);
                break;
            case 'compare':
                result = compareAllMethods(data.equation, data.a, data.b, data.ya, data.yb, data.n);
                break;
            default:
                throw new Error('Unknown method type');
        }

        const executionTime = (performance.now() - startTime).toFixed(2);
        self.postMessage({ type: 'result', calculationType: type, result, executionTime });
    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};

/**
 * Parse equation coefficients
 * For y'' = p(x)y' + q(x)y + r(x)
 */
function parseEquation(eqType, x) {
    switch (eqType) {
        case 'linear':
            // y'' = -y (simple harmonic)
            return { p: 0, q: -1, r: 0 };
        case 'bessel':
            // Simplified Bessel-like: y'' = -y/x² - y'/x
            const xSafe = Math.max(x, 0.001);
            return { p: -1/xSafe, q: -1/(xSafe*xSafe), r: 0 };
        case 'exponential':
            // y'' = y (exponential growth)
            return { p: 0, q: 1, r: 0 };
        case 'damped':
            // y'' = -0.5y' - y (damped oscillator)
            return { p: -0.5, q: -1, r: 0 };
        case 'forced':
            // y'' = -y + sin(x) (forced oscillator)
            return { p: 0, q: -1, r: Math.sin(x) };
        case 'nonhomogeneous':
            // y'' = -y + x
            return { p: 0, q: -1, r: x };
        default:
            return { p: 0, q: -1, r: 0 };
    }
}

/**
 * Shooting Method
 * Convert BVP to IVP and use bisection to find correct initial slope
 */
function shootingMethod(eqType, a, b, ya, yb, n) {
    const h = (b - a) / n;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Solve IVP with given initial slope using RK4
    function solveIVP(slope) {
        const x = [a];
        const y = [ya];
        const yp = [slope];

        for (let i = 0; i < n; i++) {
            const xi = x[i];
            const yi = y[i];
            const ypi = yp[i];

            // RK4 for y'' = f(x, y, y')
            const k1y = ypi;
            const coef1 = parseEquation(eqType, xi);
            const k1yp = coef1.p * ypi + coef1.q * yi + coef1.r;

            const k2y = ypi + h/2 * k1yp;
            const coef2 = parseEquation(eqType, xi + h/2);
            const k2yp = coef2.p * (ypi + h/2 * k1yp) + coef2.q * (yi + h/2 * k1y) + coef2.r;

            const k3y = ypi + h/2 * k2yp;
            const coef3 = parseEquation(eqType, xi + h/2);
            const k3yp = coef3.p * (ypi + h/2 * k2yp) + coef3.q * (yi + h/2 * k2y) + coef3.r;

            const k4y = ypi + h * k3yp;
            const coef4 = parseEquation(eqType, xi + h);
            const k4yp = coef4.p * (ypi + h * k3yp) + coef4.q * (yi + h * k3y) + coef4.r;

            x.push(xi + h);
            y.push(yi + h/6 * (k1y + 2*k2y + 2*k3y + k4y));
            yp.push(ypi + h/6 * (k1yp + 2*k2yp + 2*k3yp + k4yp));
        }

        return { x, y, yp, finalY: y[n] };
    }

    // Bisection to find correct initial slope
    let slopeLow = -10;
    let slopeHigh = 10;
    let slope = 0;
    const tolerance = 1e-8;
    const maxIterations = 100;

    let resLow = solveIVP(slopeLow).finalY - yb;
    let resHigh = solveIVP(slopeHigh).finalY - yb;

    // Expand search range if needed
    while (resLow * resHigh > 0 && slopeLow > -1000) {
        slopeLow *= 2;
        slopeHigh *= 2;
        resLow = solveIVP(slopeLow).finalY - yb;
        resHigh = solveIVP(slopeHigh).finalY - yb;
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    let iterations = 0;
    for (let iter = 0; iter < maxIterations; iter++) {
        slope = (slopeLow + slopeHigh) / 2;
        const result = solveIVP(slope);
        const residual = result.finalY - yb;

        iterations = iter + 1;

        if (Math.abs(residual) < tolerance) {
            break;
        }

        if (residual * resLow < 0) {
            slopeHigh = slope;
            resHigh = residual;
        } else {
            slopeLow = slope;
            resLow = residual;
        }

        if (iter % 10 === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 30 + Math.round((iter / maxIterations) * 60)
            });
        }
    }

    const finalSolution = solveIVP(slope);

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Shooting Method',
        description: 'Convert BVP to IVP with bisection for initial slope',
        x: finalSolution.x,
        y: finalSolution.y,
        yp: finalSolution.yp,
        initialSlope: slope,
        iterations: iterations,
        equation: eqType,
        boundaryA: { x: a, y: ya },
        boundaryB: { x: b, y: yb },
        n: n
    };
}

/**
 * Finite Difference Method
 * Discretize the differential equation and solve linear system
 */
function finiteDifferenceMethod(eqType, a, b, ya, yb, n) {
    const h = (b - a) / n;
    const h2 = h * h;

    self.postMessage({ type: 'progress', percentage: 10 });

    // Build tridiagonal system: A*y = d
    // For y'' = p(x)y' + q(x)y + r(x)
    // Using central differences:
    // (y[i+1] - 2y[i] + y[i-1])/h² = p[i]*(y[i+1] - y[i-1])/(2h) + q[i]*y[i] + r[i]

    const x = [];
    for (let i = 0; i <= n; i++) {
        x.push(a + i * h);
    }

    // Interior points only (n-1 equations)
    const size = n - 1;
    const lower = new Array(size).fill(0);
    const diag = new Array(size).fill(0);
    const upper = new Array(size).fill(0);
    const rhs = new Array(size).fill(0);

    self.postMessage({ type: 'progress', percentage: 30 });

    for (let i = 1; i < n; i++) {
        const xi = x[i];
        const coef = parseEquation(eqType, xi);
        const idx = i - 1;

        // Coefficients from discretization
        lower[idx] = 1/h2 - coef.p/(2*h);
        diag[idx] = -2/h2 + coef.q;
        upper[idx] = 1/h2 + coef.p/(2*h);
        rhs[idx] = coef.r;

        // Apply boundary conditions
        if (i === 1) {
            rhs[idx] -= lower[idx] * ya;
        }
        if (i === n - 1) {
            rhs[idx] -= upper[idx] * yb;
        }
    }

    self.postMessage({ type: 'progress', percentage: 50 });

    // Solve tridiagonal system using Thomas algorithm
    const y = thomasAlgorithm(lower, diag, upper, rhs);

    // Build complete solution
    const ySolution = [ya, ...y, yb];

    // Compute derivatives using central differences
    const yp = [];
    for (let i = 0; i <= n; i++) {
        if (i === 0) {
            yp.push((ySolution[1] - ySolution[0]) / h);
        } else if (i === n) {
            yp.push((ySolution[n] - ySolution[n-1]) / h);
        } else {
            yp.push((ySolution[i+1] - ySolution[i-1]) / (2*h));
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Finite Difference Method',
        description: 'Second-order central differences with tridiagonal solver',
        x: x,
        y: ySolution,
        yp: yp,
        equation: eqType,
        boundaryA: { x: a, y: ya },
        boundaryB: { x: b, y: yb },
        n: n,
        h: h
    };
}

/**
 * Thomas Algorithm for tridiagonal systems
 */
function thomasAlgorithm(lower, diag, upper, rhs) {
    const n = diag.length;
    const c = new Array(n).fill(0);
    const d = new Array(n).fill(0);
    const y = new Array(n).fill(0);

    // Forward sweep
    c[0] = upper[0] / diag[0];
    d[0] = rhs[0] / diag[0];

    for (let i = 1; i < n; i++) {
        const denom = diag[i] - lower[i] * c[i-1];
        c[i] = upper[i] / denom;
        d[i] = (rhs[i] - lower[i] * d[i-1]) / denom;
    }

    // Back substitution
    y[n-1] = d[n-1];
    for (let i = n - 2; i >= 0; i--) {
        y[i] = d[i] - c[i] * y[i+1];
    }

    return y;
}

/**
 * Collocation Method
 * Use polynomial approximation satisfying boundary conditions
 */
function collocationMethod(eqType, a, b, ya, yb, n) {
    self.postMessage({ type: 'progress', percentage: 10 });

    // Use polynomial basis: y(x) = ya + (x-a)/(b-a) * (yb-ya) + (x-a)(x-b) * Σc_k*x^k
    // This automatically satisfies boundary conditions

    const numCoeffs = Math.min(n - 1, 5); // Limit polynomial degree
    const x = [];
    const h = (b - a) / n;
    for (let i = 0; i <= n; i++) {
        x.push(a + i * h);
    }

    // Collocation points (Chebyshev nodes in [a,b])
    const collocationPts = [];
    for (let k = 1; k <= numCoeffs; k++) {
        const theta = (2*k - 1) * Math.PI / (2 * numCoeffs);
        const xk = 0.5 * ((b - a) * Math.cos(theta) + (a + b));
        collocationPts.push(xk);
    }

    self.postMessage({ type: 'progress', percentage: 30 });

    // Build system for collocation (simplified linear solve)
    // For demonstration, use least squares fitting

    // Evaluate basis functions and their derivatives at collocation points
    const A = [];
    const rhs = [];

    for (let i = 0; i < numCoeffs; i++) {
        const xi = collocationPts[i];
        const coef = parseEquation(eqType, xi);

        const row = [];
        for (let k = 0; k < numCoeffs; k++) {
            // Basis: φ_k(x) = (x-a)(x-b) * x^k
            // φ_k'' = 2*x^k + 2*(x-a)*k*x^(k-1) + 2*(x-b)*k*x^(k-1) + (x-a)(x-b)*k*(k-1)*x^(k-2)
            // Simplified evaluation
            const phi = (xi - a) * (xi - b) * Math.pow(xi, k);
            const phi_x = (xi - b) * Math.pow(xi, k) + (xi - a) * Math.pow(xi, k) +
                         (xi - a) * (xi - b) * (k > 0 ? k * Math.pow(xi, k-1) : 0);
            const phi_xx = 2 * Math.pow(xi, k) +
                          2 * (xi - a) * (k > 0 ? k * Math.pow(xi, k-1) : 0) +
                          2 * (xi - b) * (k > 0 ? k * Math.pow(xi, k-1) : 0) +
                          (xi - a) * (xi - b) * (k > 1 ? k * (k-1) * Math.pow(xi, k-2) : 0);

            // Residual: y'' - p*y' - q*y - r = 0
            row.push(phi_xx - coef.p * phi_x - coef.q * phi);
        }
        A.push(row);

        // RHS from boundary interpolation
        const yBC = ya + (xi - a) / (b - a) * (yb - ya);
        const yBC_x = (yb - ya) / (b - a);
        const yBC_xx = 0;
        rhs.push(coef.r - (yBC_xx - coef.p * yBC_x - coef.q * yBC));
    }

    self.postMessage({ type: 'progress', percentage: 60 });

    // Solve using simple Gaussian elimination
    const coeffs = solveLinearSystem(A, rhs);

    // Evaluate solution
    const y = [];
    const yp = [];
    for (let i = 0; i <= n; i++) {
        const xi = x[i];
        // Boundary satisfying part
        let yi = ya + (xi - a) / (b - a) * (yb - ya);
        let ypi = (yb - ya) / (b - a);

        // Add polynomial correction
        for (let k = 0; k < numCoeffs; k++) {
            const phi = (xi - a) * (xi - b) * Math.pow(xi, k);
            const phi_x = (xi - b) * Math.pow(xi, k) + (xi - a) * Math.pow(xi, k) +
                         (xi - a) * (xi - b) * (k > 0 ? k * Math.pow(xi, k-1) : 0);
            yi += coeffs[k] * phi;
            ypi += coeffs[k] * phi_x;
        }

        y.push(yi);
        yp.push(ypi);
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Collocation Method',
        description: 'Polynomial approximation with Chebyshev collocation points',
        x: x,
        y: y,
        yp: yp,
        coefficients: coeffs,
        collocationPoints: collocationPts,
        equation: eqType,
        boundaryA: { x: a, y: ya },
        boundaryB: { x: b, y: yb },
        n: n
    };
}

/**
 * Simple linear system solver using Gaussian elimination
 */
function solveLinearSystem(A, b) {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i]]);

    // Forward elimination
    for (let i = 0; i < n; i++) {
        // Partial pivoting
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
                maxRow = k;
            }
        }
        [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

        // Eliminate column
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(augmented[i][i]) > 1e-10) {
                const factor = augmented[k][i] / augmented[i][i];
                for (let j = i; j <= n; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = augmented[i][n];
        for (let j = i + 1; j < n; j++) {
            sum -= augmented[i][j] * x[j];
        }
        x[i] = Math.abs(augmented[i][i]) > 1e-10 ? sum / augmented[i][i] : 0;
    }

    return x;
}

/**
 * Relaxation (Iterative) Method
 */
function relaxationMethod(eqType, a, b, ya, yb, n, tolerance = 1e-6) {
    const h = (b - a) / n;
    const h2 = h * h;

    const x = [];
    for (let i = 0; i <= n; i++) {
        x.push(a + i * h);
    }

    // Initial guess (linear interpolation)
    let y = [];
    for (let i = 0; i <= n; i++) {
        y.push(ya + (yb - ya) * i / n);
    }

    self.postMessage({ type: 'progress', percentage: 10 });

    const maxIterations = 10000;
    let iterations = 0;
    let converged = false;
    const omega = 1.5; // SOR relaxation parameter

    for (let iter = 0; iter < maxIterations; iter++) {
        let maxChange = 0;

        for (let i = 1; i < n; i++) {
            const xi = x[i];
            const coef = parseEquation(eqType, xi);

            // From y'' = p*y' + q*y + r
            // y[i] = (y[i+1] + y[i-1] - h²*r - h*p*(y[i+1]-y[i-1])/2) / (2 - h²*q)
            const yOld = y[i];
            const denom = 2 - h2 * coef.q;
            const yNew = (y[i+1] + y[i-1] - h2 * coef.r -
                         h * coef.p * (y[i+1] - y[i-1]) / 2) / denom;

            // SOR update
            y[i] = yOld + omega * (yNew - yOld);
            maxChange = Math.max(maxChange, Math.abs(y[i] - yOld));
        }

        iterations = iter + 1;

        if (maxChange < tolerance) {
            converged = true;
            break;
        }

        if (iter % Math.floor(maxIterations / 20) === 0) {
            self.postMessage({
                type: 'progress',
                percentage: 10 + Math.round((iter / maxIterations) * 80)
            });
        }
    }

    // Compute derivatives
    const yp = [];
    for (let i = 0; i <= n; i++) {
        if (i === 0) {
            yp.push((y[1] - y[0]) / h);
        } else if (i === n) {
            yp.push((y[n] - y[n-1]) / h);
        } else {
            yp.push((y[i+1] - y[i-1]) / (2*h));
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Relaxation Method (SOR)',
        description: 'Successive Over-Relaxation with ω = ' + omega,
        x: x,
        y: y,
        yp: yp,
        iterations: iterations,
        converged: converged,
        equation: eqType,
        boundaryA: { x: a, y: ya },
        boundaryB: { x: b, y: yb },
        n: n
    };
}

/**
 * Compare all methods
 */
function compareAllMethods(eqType, a, b, ya, yb, n) {
    self.postMessage({ type: 'progress', percentage: 10 });

    const shooting = shootingMethod(eqType, a, b, ya, yb, n);
    self.postMessage({ type: 'progress', percentage: 35 });

    const finiteDiff = finiteDifferenceMethod(eqType, a, b, ya, yb, n);
    self.postMessage({ type: 'progress', percentage: 60 });

    const collocation = collocationMethod(eqType, a, b, ya, yb, n);
    self.postMessage({ type: 'progress', percentage: 85 });

    const relaxation = relaxationMethod(eqType, a, b, ya, yb, n);
    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        method: 'Method Comparison',
        results: {
            shooting: { x: shooting.x, y: shooting.y, name: 'Shooting' },
            finiteDifference: { x: finiteDiff.x, y: finiteDiff.y, name: 'Finite Difference' },
            collocation: { x: collocation.x, y: collocation.y, name: 'Collocation' },
            relaxation: { x: relaxation.x, y: relaxation.y, name: 'Relaxation' }
        },
        equation: eqType,
        boundaryA: { x: a, y: ya },
        boundaryB: { x: b, y: yb },
        n: n
    };
}
