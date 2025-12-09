/**
 * Web Worker for Lagrange Interpolation
 * Construct interpolating polynomials through data points
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { points, evalPoint, rangeStart, rangeEnd, rangeSteps, originalFunction } = data;

        // Validate points
        if (points.length < 2) {
            throw new Error('Need at least 2 data points');
        }

        // Check for duplicate x values
        const xValues = points.map(p => p.x);
        const uniqueX = new Set(xValues);
        if (uniqueX.size !== xValues.length) {
            throw new Error('All x values must be distinct');
        }

        reportProgress(10);

        // Calculate Lagrange basis polynomial values and coefficients
        const n = points.length;
        const basisValues = computeBasisValuesAt(points, evalPoint);

        reportProgress(30);

        // Interpolated value at evalPoint
        const interpolatedValue = points.reduce((sum, p, i) =>
            sum + p.y * basisValues[i], 0);

        // Compute polynomial coefficients (for display)
        const coefficients = computeCoefficients(points);

        reportProgress(50);

        // Evaluate over range for visualization
        const curvePoints = [];
        const step = (rangeEnd - rangeStart) / rangeSteps;
        for (let i = 0; i <= rangeSteps; i++) {
            const x = rangeStart + i * step;
            const y = evaluateLagrange(points, x);
            curvePoints.push({ x, y });
            if (i % 10 === 0) {
                reportProgress(50 + 30 * (i / rangeSteps));
            }
        }

        // Compute basis polynomials at evalPoint (for visualization)
        const basisPolynomials = [];
        for (let i = 0; i < n; i++) {
            const basisCurve = [];
            for (let j = 0; j <= rangeSteps; j++) {
                const x = rangeStart + j * step;
                const L = computeLagrangeBasis(points, i, x);
                basisCurve.push({ x, y: L });
            }
            basisPolynomials.push({
                index: i,
                point: points[i],
                values: basisCurve,
                atEval: basisValues[i]
            });
        }

        // Error analysis if original function is known
        let errorAnalysis = null;
        if (originalFunction) {
            const f = createOriginalFunction(originalFunction);
            errorAnalysis = analyzeError(points, curvePoints, f);
        }

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                points,
                interpolatedValue,
                evalPoint,
                coefficients,
                curvePoints,
                basisPolynomials,
                errorAnalysis,
                degree: n - 1
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

function computeLagrangeBasis(points, i, x) {
    const n = points.length;
    let Li = 1;

    for (let j = 0; j < n; j++) {
        if (j !== i) {
            Li *= (x - points[j].x) / (points[i].x - points[j].x);
        }
    }

    return Li;
}

function computeBasisValuesAt(points, x) {
    return points.map((_, i) => computeLagrangeBasis(points, i, x));
}

function evaluateLagrange(points, x) {
    const basisValues = computeBasisValuesAt(points, x);
    return points.reduce((sum, p, i) => sum + p.y * basisValues[i], 0);
}

function computeCoefficients(points) {
    // Compute polynomial coefficients using the fact that
    // P(x) = sum of y_i * L_i(x)
    // This is more for display than efficiency

    const n = points.length;
    const coeffs = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
        // Compute coefficients of L_i(x) and scale by y_i
        const Li = computeBasisCoefficients(points, i);
        for (let j = 0; j < n; j++) {
            coeffs[j] += points[i].y * Li[j];
        }
    }

    return coeffs;
}

function computeBasisCoefficients(points, i) {
    // Compute coefficients of the i-th Lagrange basis polynomial
    const n = points.length;

    // Start with polynomial 1
    let coeffs = [1];

    // Multiply by (x - x_j) / (x_i - x_j) for each j != i
    for (let j = 0; j < n; j++) {
        if (j !== i) {
            const scale = 1 / (points[i].x - points[j].x);
            const newCoeffs = new Array(coeffs.length + 1).fill(0);

            // Multiply current polynomial by (x - x_j)
            for (let k = 0; k < coeffs.length; k++) {
                newCoeffs[k + 1] += coeffs[k] * scale;        // x term
                newCoeffs[k] -= coeffs[k] * points[j].x * scale; // constant term
            }

            coeffs = newCoeffs;
        }
    }

    return coeffs;
}

function createOriginalFunction(funcType) {
    switch (funcType) {
        case 'sin':
            return x => Math.sin(x);
        case 'exp':
            return x => Math.exp(x);
        case 'runge':
            return x => 1 / (1 + 25 * x * x);
        case 'polynomial':
            return x => x * x * x - 2 * x + 1;
        default:
            return null;
    }
}

function analyzeError(points, curvePoints, f) {
    if (!f) return null;

    let maxError = 0;
    let maxErrorX = 0;
    let sumSquaredError = 0;

    const errors = curvePoints.map(cp => {
        const exact = f(cp.x);
        const error = Math.abs(cp.y - exact);

        if (error > maxError) {
            maxError = error;
            maxErrorX = cp.x;
        }
        sumSquaredError += error * error;

        return { x: cp.x, error, interpolated: cp.y, exact };
    });

    const rmse = Math.sqrt(sumSquaredError / curvePoints.length);

    return {
        maxError,
        maxErrorX,
        rmse,
        errors
    };
}
