/**
 * Web Worker for Newton Interpolation
 * Construct interpolating polynomials using divided differences
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { points, evalPoint, rangeStart, rangeEnd, originalFunction } = data;

        if (points.length < 2) {
            throw new Error('Need at least 2 data points');
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

        // Compute divided difference table
        const n = points.length;
        const divDiffTable = computeDividedDifferenceTable(points);

        reportProgress(30);

        // Get Newton coefficients (diagonal of the table)
        const coefficients = divDiffTable[0];

        // Evaluate at the specified point
        const interpolatedValue = evaluateNewton(points, coefficients, evalPoint);

        reportProgress(50);

        // Evaluate over range for visualization
        const curvePoints = [];
        const steps = 100;
        const step = (rangeEnd - rangeStart) / steps;
        for (let i = 0; i <= steps; i++) {
            const x = rangeStart + i * step;
            const y = evaluateNewton(points, coefficients, x);
            curvePoints.push({ x, y });
        }

        reportProgress(70);

        // Convert to standard polynomial form
        const standardCoeffs = convertToStandardForm(points, coefficients);

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
                divDiffTable,
                coefficients,
                interpolatedValue,
                evalPoint,
                curvePoints,
                standardCoeffs,
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

function computeDividedDifferenceTable(points) {
    const n = points.length;
    // table[i][j] = f[xᵢ, xᵢ₊₁, ..., xᵢ₊ⱼ]
    const table = Array(n).fill(null).map(() => Array(n).fill(0));

    // First column: f[xᵢ] = yᵢ
    for (let i = 0; i < n; i++) {
        table[i][0] = points[i].y;
    }

    // Fill in the rest of the table
    for (let j = 1; j < n; j++) {
        for (let i = 0; i < n - j; i++) {
            table[i][j] = (table[i + 1][j - 1] - table[i][j - 1]) /
                          (points[i + j].x - points[i].x);
        }
    }

    return table;
}

function evaluateNewton(points, coeffs, x) {
    // Use Horner's method for nested multiplication
    // P(x) = c₀ + (x-x₀)(c₁ + (x-x₁)(c₂ + ...))
    const n = coeffs.length;
    let result = coeffs[n - 1];

    for (let i = n - 2; i >= 0; i--) {
        result = result * (x - points[i].x) + coeffs[i];
    }

    return result;
}

function convertToStandardForm(points, newtonCoeffs) {
    // Convert Newton form to standard polynomial form aₙxⁿ + ... + a₁x + a₀
    const n = newtonCoeffs.length;
    const coeffs = new Array(n).fill(0);

    // Start with the highest-order term
    coeffs[0] = newtonCoeffs[n - 1];

    // Multiply by (x - xᵢ) and add next coefficient
    for (let i = n - 2; i >= 0; i--) {
        // Multiply current polynomial by (x - xᵢ)
        for (let j = n - 1; j > 0; j--) {
            coeffs[j] = coeffs[j - 1] - points[i].x * coeffs[j];
        }
        coeffs[0] = -points[i].x * coeffs[0] + newtonCoeffs[i];
    }

    return coeffs.reverse(); // Return with constant term first
}

function createOriginalFunction(funcType) {
    switch (funcType) {
        case 'sin': return x => Math.sin(x);
        case 'exp': return x => Math.exp(x);
        case 'polynomial': return x => x * x * x - 2 * x + 1;
        case 'sqrt': return x => Math.sqrt(Math.max(0, x));
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
