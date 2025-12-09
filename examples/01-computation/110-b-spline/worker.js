/**
 * Web Worker for B-Spline Curves
 * Uses Cox-de Boor algorithm for basis function evaluation
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { controlPoints, degree, knotType, customKnots, evalParam, numSamples } = data;

        const n = controlPoints.length;
        const k = degree;

        if (n < k + 1) {
            throw new Error(`Need at least ${k + 1} control points for degree ${k}`);
        }

        reportProgress(10);

        // Generate knot vector
        const knots = generateKnotVector(n, k, knotType, customKnots);

        // Validate knot vector
        if (knots.length !== n + k + 1) {
            throw new Error(`Knot vector should have ${n + k + 1} elements, got ${knots.length}`);
        }

        // Check knots are non-decreasing
        for (let i = 1; i < knots.length; i++) {
            if (knots[i] < knots[i - 1]) {
                throw new Error('Knot vector must be non-decreasing');
            }
        }

        reportProgress(20);

        // Get parameter range
        const tMin = knots[k];
        const tMax = knots[n];

        // Evaluate at single parameter
        const evalT = tMin + evalParam * (tMax - tMin);
        const basisValues = evaluateBasisFunctions(evalT, knots, k, n);
        const evalPoint = evaluateBSpline(controlPoints, basisValues);

        reportProgress(40);

        // Generate curve samples
        const curvePoints = [];
        for (let i = 0; i <= numSamples; i++) {
            const t = tMin + (i / numSamples) * (tMax - tMin);
            const basis = evaluateBasisFunctions(t, knots, k, n);
            const pt = evaluateBSpline(controlPoints, basis);
            curvePoints.push({ t, x: pt.x, y: pt.y, basis });

            if (i % 20 === 0) {
                reportProgress(40 + Math.round(50 * i / numSamples));
            }
        }

        reportProgress(95);

        // Compute basis function samples for visualization
        const basisSamples = [];
        const basisSteps = 50;
        for (let i = 0; i <= basisSteps; i++) {
            const t = tMin + (i / basisSteps) * (tMax - tMin);
            const basis = evaluateBasisFunctions(t, knots, k, n);
            basisSamples.push({ t, basis });
        }

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                controlPoints,
                degree: k,
                knots,
                knotType,
                evalParam,
                evalT,
                evalPoint,
                basisValues,
                curvePoints,
                basisSamples,
                tMin,
                tMax,
                numControlPoints: n
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

function generateKnotVector(n, k, knotType, customKnots) {
    const numKnots = n + k + 1;

    if (knotType === 'custom' && customKnots) {
        return customKnots;
    }

    if (knotType === 'uniform') {
        // Uniform knot vector: [0, 1, 2, ..., n+k]
        const knots = [];
        for (let i = 0; i < numKnots; i++) {
            knots.push(i);
        }
        return knots;
    }

    if (knotType === 'clamped') {
        // Clamped (open) knot vector
        // First k+1 knots are 0, last k+1 knots are 1
        // Middle knots are evenly spaced
        const knots = [];
        const numMiddle = numKnots - 2 * (k + 1);

        // First k+1 zeros
        for (let i = 0; i <= k; i++) {
            knots.push(0);
        }

        // Middle knots
        for (let i = 1; i <= numMiddle; i++) {
            knots.push(i / (numMiddle + 1));
        }

        // Last k+1 ones
        for (let i = 0; i <= k; i++) {
            knots.push(1);
        }

        return knots;
    }

    throw new Error('Unknown knot type: ' + knotType);
}

function evaluateBasisFunctions(t, knots, k, n) {
    // Cox-de Boor algorithm for evaluating all basis functions at t
    const basis = new Array(n).fill(0);

    // Handle boundary cases
    if (t <= knots[k]) {
        basis[0] = 1;
        return basis;
    }
    if (t >= knots[n]) {
        basis[n - 1] = 1;
        return basis;
    }

    // Find knot span containing t
    let span = k;
    for (let i = k; i < n; i++) {
        if (t >= knots[i] && t < knots[i + 1]) {
            span = i;
            break;
        }
    }

    // Initialize degree 0 basis functions
    const N = new Array(k + 1).fill(0);
    N[0] = 1;

    // Compute basis functions using Cox-de Boor recursion
    for (let d = 1; d <= k; d++) {
        // Save left term for next iteration
        let saved = 0;

        for (let r = 0; r < d; r++) {
            const left = span - d + 1 + r;
            const right = span + 1 + r;

            // Calculate denominators
            const denomLeft = knots[left + d] - knots[left];
            const denomRight = knots[right] - knots[right - d];

            // Left term
            let leftTerm = 0;
            if (Math.abs(denomLeft) > 1e-10) {
                leftTerm = (t - knots[left]) / denomLeft;
            }

            // Right term
            let rightTerm = 0;
            if (Math.abs(denomRight) > 1e-10) {
                rightTerm = (knots[right] - t) / denomRight;
            }

            const temp = N[r];
            N[r] = saved + rightTerm * temp;
            saved = leftTerm * temp;
        }
        N[d] = saved;
    }

    // Copy to result array
    for (let i = 0; i <= k; i++) {
        const idx = span - k + i;
        if (idx >= 0 && idx < n) {
            basis[idx] = N[i];
        }
    }

    return basis;
}

function evaluateBSpline(controlPoints, basisValues) {
    let x = 0, y = 0;
    for (let i = 0; i < controlPoints.length; i++) {
        x += controlPoints[i].x * basisValues[i];
        y += controlPoints[i].y * basisValues[i];
    }
    return { x, y };
}
