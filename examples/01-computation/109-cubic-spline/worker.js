/**
 * Web Worker for Cubic Spline Interpolation
 * Constructs smooth piecewise cubic polynomials using tridiagonal system
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { points, evalPoint, rangeStart, rangeEnd, boundaryType,
                leftDerivative, rightDerivative, originalFunction } = data;

        if (points.length < 3) {
            throw new Error('Need at least 3 data points for cubic spline');
        }

        // Check for duplicate x values
        const xValues = points.map(p => p.x);
        const uniqueX = new Set(xValues);
        if (uniqueX.size !== xValues.length) {
            throw new Error('All x values must be distinct');
        }

        // Sort points by x
        points.sort((a, b) => a.x - b.x);

        reportProgress(10);

        const n = points.length;

        // Compute intervals h[i] = x[i+1] - x[i]
        const h = [];
        for (let i = 0; i < n - 1; i++) {
            h.push(points[i + 1].x - points[i].x);
        }

        reportProgress(20);

        // Solve for second derivatives M using tridiagonal system
        const M = solveTridiagonal(points, h, boundaryType, leftDerivative, rightDerivative);

        reportProgress(50);

        // Compute spline coefficients for each interval
        const splineCoeffs = computeSplineCoefficients(points, h, M);

        // Evaluate at specified point
        const interpolatedValue = evaluateSpline(points, splineCoeffs, evalPoint);

        reportProgress(70);

        // Evaluate over range for visualization
        const curvePoints = [];
        const steps = 200;
        const step = (rangeEnd - rangeStart) / steps;
        for (let i = 0; i <= steps; i++) {
            const x = rangeStart + i * step;
            const y = evaluateSpline(points, splineCoeffs, x);
            curvePoints.push({ x, y });
        }

        reportProgress(85);

        // Error analysis if original function is known
        let errorAnalysis = null;
        if (originalFunction) {
            const f = createOriginalFunction(originalFunction);
            errorAnalysis = analyzeError(curvePoints, f);
        }

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                points,
                splineCoeffs,
                secondDerivatives: M,
                intervals: h,
                interpolatedValue,
                evalPoint,
                curvePoints,
                errorAnalysis,
                boundaryType,
                numIntervals: n - 1
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

function solveTridiagonal(points, h, boundaryType, leftDeriv, rightDeriv) {
    const n = points.length;

    // Set up tridiagonal system for second derivatives M
    // System: lower[i] * M[i-1] + diag[i] * M[i] + upper[i] * M[i+1] = rhs[i]

    const diag = new Array(n).fill(0);
    const upper = new Array(n).fill(0);
    const lower = new Array(n).fill(0);
    const rhs = new Array(n).fill(0);

    // Interior equations (from C² continuity)
    for (let i = 1; i < n - 1; i++) {
        lower[i] = h[i - 1];
        diag[i] = 2 * (h[i - 1] + h[i]);
        upper[i] = h[i];
        rhs[i] = 6 * ((points[i + 1].y - points[i].y) / h[i] -
                      (points[i].y - points[i - 1].y) / h[i - 1]);
    }

    // Boundary conditions
    if (boundaryType === 'natural') {
        // Natural spline: M[0] = M[n-1] = 0
        diag[0] = 1;
        upper[0] = 0;
        rhs[0] = 0;

        diag[n - 1] = 1;
        lower[n - 1] = 0;
        rhs[n - 1] = 0;
    } else if (boundaryType === 'clamped') {
        // Clamped spline: S'(x0) = leftDeriv, S'(xn) = rightDeriv
        diag[0] = 2 * h[0];
        upper[0] = h[0];
        rhs[0] = 6 * ((points[1].y - points[0].y) / h[0] - leftDeriv);

        diag[n - 1] = 2 * h[n - 2];
        lower[n - 1] = h[n - 2];
        rhs[n - 1] = 6 * (rightDeriv - (points[n - 1].y - points[n - 2].y) / h[n - 2]);
    } else if (boundaryType === 'notaknot') {
        // Not-a-knot: Third derivative continuous at x1 and x_{n-2}
        diag[0] = h[1];
        upper[0] = -(h[0] + h[1]);
        rhs[0] = 0;
        lower[1] = h[0] - h[1];  // Modify second row

        diag[n - 1] = h[n - 3];
        lower[n - 1] = -(h[n - 3] + h[n - 2]);
        rhs[n - 1] = 0;
        upper[n - 2] = h[n - 2] - h[n - 3];  // Modify second-to-last row
    }

    // Solve using Thomas algorithm (forward elimination, back substitution)
    return thomasAlgorithm(lower, diag, upper, rhs);
}

function thomasAlgorithm(a, b, c, d) {
    // Solves tridiagonal system: a[i]*x[i-1] + b[i]*x[i] + c[i]*x[i+1] = d[i]
    const n = d.length;
    const x = new Array(n).fill(0);
    const cp = new Array(n).fill(0);
    const dp = new Array(n).fill(0);

    // Forward sweep
    cp[0] = c[0] / b[0];
    dp[0] = d[0] / b[0];

    for (let i = 1; i < n; i++) {
        const denom = b[i] - a[i] * cp[i - 1];
        if (Math.abs(denom) < 1e-15) {
            throw new Error('Tridiagonal system is singular or nearly singular');
        }
        cp[i] = c[i] / denom;
        dp[i] = (d[i] - a[i] * dp[i - 1]) / denom;
    }

    // Back substitution
    x[n - 1] = dp[n - 1];
    for (let i = n - 2; i >= 0; i--) {
        x[i] = dp[i] - cp[i] * x[i + 1];
    }

    return x;
}

function computeSplineCoefficients(points, h, M) {
    const n = points.length;
    const coeffs = [];

    for (let i = 0; i < n - 1; i++) {
        // Coefficients for S_i(x) = a + b(x-x_i) + c(x-x_i)^2 + d(x-x_i)^3
        const a = points[i].y;
        const b = (points[i + 1].y - points[i].y) / h[i] - h[i] * (2 * M[i] + M[i + 1]) / 6;
        const c = M[i] / 2;
        const d = (M[i + 1] - M[i]) / (6 * h[i]);

        coeffs.push({
            a, b, c, d,
            x0: points[i].x,
            x1: points[i + 1].x
        });
    }

    return coeffs;
}

function evaluateSpline(points, coeffs, x) {
    const n = points.length;

    // Find the interval containing x
    let i = 0;
    if (x <= points[0].x) {
        i = 0;
    } else if (x >= points[n - 1].x) {
        i = n - 2;
    } else {
        for (let j = 0; j < n - 1; j++) {
            if (x >= points[j].x && x < points[j + 1].x) {
                i = j;
                break;
            }
        }
    }

    // Evaluate using Horner's form
    const dx = x - coeffs[i].x0;
    const { a, b, c, d } = coeffs[i];
    return a + dx * (b + dx * (c + dx * d));
}

function createOriginalFunction(funcType) {
    switch (funcType) {
        case 'sin': return x => Math.sin(x);
        case 'exp': return x => Math.exp(x);
        case 'polynomial': return x => x * x * x - 2 * x + 1;
        case 'runge': return x => 1 / (1 + x * x);
        default: return null;
    }
}

function analyzeError(curvePoints, f) {
    if (!f) return null;

    let maxError = 0;
    let maxErrorX = 0;
    let sumSquaredError = 0;

    curvePoints.forEach(cp => {
        const exact = f(cp.x);
        const error = Math.abs(cp.y - exact);

        if (error > maxError) {
            maxError = error;
            maxErrorX = cp.x;
        }
        sumSquaredError += error * error;
    });

    return {
        maxError,
        maxErrorX,
        rmse: Math.sqrt(sumSquaredError / curvePoints.length)
    };
}
