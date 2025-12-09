/**
 * Web Worker for Bezier Curves
 * Uses de Casteljau's algorithm for curve evaluation
 */

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { controlPoints, evalParam, numSamples, showConstruction } = data;

        if (controlPoints.length < 2) {
            throw new Error('Need at least 2 control points');
        }

        const n = controlPoints.length - 1; // Degree

        reportProgress(10);

        // Evaluate at single parameter with construction steps
        const evalResult = evaluateBezierWithConstruction(controlPoints, evalParam);

        reportProgress(30);

        // Compute Bernstein polynomial values at evalParam
        const bernsteinValues = computeBernstein(n, evalParam);

        reportProgress(40);

        // Generate curve samples
        const curvePoints = [];
        for (let i = 0; i <= numSamples; i++) {
            const t = i / numSamples;
            const pt = evaluateBezier(controlPoints, t);
            curvePoints.push({ t, x: pt.x, y: pt.y });

            if (i % 20 === 0) {
                reportProgress(40 + Math.round(40 * i / numSamples));
            }
        }

        reportProgress(85);

        // Compute derivatives at endpoints
        const derivatives = computeDerivatives(controlPoints);

        // Compute curve length approximation
        const curveLength = approximateCurveLength(curvePoints);

        // Compute bounding box
        const boundingBox = computeBoundingBox(curvePoints, controlPoints);

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                controlPoints,
                degree: n,
                evalParam,
                evalPoint: evalResult.point,
                constructionLevels: showConstruction ? evalResult.levels : null,
                bernsteinValues,
                curvePoints,
                derivatives,
                curveLength,
                boundingBox,
                numSamples
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

function evaluateBezier(points, t) {
    // de Casteljau's algorithm without storing intermediate steps
    const n = points.length;
    let current = points.map(p => ({ x: p.x, y: p.y }));

    for (let level = 1; level < n; level++) {
        const next = [];
        for (let i = 0; i < n - level; i++) {
            next.push({
                x: (1 - t) * current[i].x + t * current[i + 1].x,
                y: (1 - t) * current[i].y + t * current[i + 1].y
            });
        }
        current = next;
    }

    return current[0];
}

function evaluateBezierWithConstruction(points, t) {
    // de Casteljau's algorithm with all intermediate points
    const n = points.length;
    const levels = [points.map(p => ({ x: p.x, y: p.y }))];

    let current = levels[0];

    for (let level = 1; level < n; level++) {
        const next = [];
        for (let i = 0; i < n - level; i++) {
            next.push({
                x: (1 - t) * current[i].x + t * current[i + 1].x,
                y: (1 - t) * current[i].y + t * current[i + 1].y
            });
        }
        levels.push(next);
        current = next;
    }

    return {
        point: current[0],
        levels: levels
    };
}

function computeBernstein(n, t) {
    // Compute all Bernstein polynomials B_{i,n}(t) for i = 0 to n
    const bernstein = [];

    for (let i = 0; i <= n; i++) {
        const binomial = binomialCoeff(n, i);
        const value = binomial * Math.pow(t, i) * Math.pow(1 - t, n - i);
        bernstein.push({
            i,
            binomial,
            tPower: Math.pow(t, i),
            oneMinusTpower: Math.pow(1 - t, n - i),
            value
        });
    }

    return bernstein;
}

function binomialCoeff(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;

    let result = 1;
    for (let i = 0; i < k; i++) {
        result = result * (n - i) / (i + 1);
    }
    return Math.round(result);
}

function computeDerivatives(points) {
    const n = points.length - 1;

    // First derivative at t=0: n * (P1 - P0)
    const derivAt0 = {
        x: n * (points[1].x - points[0].x),
        y: n * (points[1].y - points[0].y)
    };

    // First derivative at t=1: n * (Pn - Pn-1)
    const derivAt1 = {
        x: n * (points[n].x - points[n - 1].x),
        y: n * (points[n].y - points[n - 1].y)
    };

    // Tangent angles
    const angleAt0 = Math.atan2(derivAt0.y, derivAt0.x) * 180 / Math.PI;
    const angleAt1 = Math.atan2(derivAt1.y, derivAt1.x) * 180 / Math.PI;

    return {
        at0: derivAt0,
        at1: derivAt1,
        angleAt0,
        angleAt1,
        magnitudeAt0: Math.sqrt(derivAt0.x * derivAt0.x + derivAt0.y * derivAt0.y),
        magnitudeAt1: Math.sqrt(derivAt1.x * derivAt1.x + derivAt1.y * derivAt1.y)
    };
}

function approximateCurveLength(curvePoints) {
    let length = 0;
    for (let i = 1; i < curvePoints.length; i++) {
        const dx = curvePoints[i].x - curvePoints[i - 1].x;
        const dy = curvePoints[i].y - curvePoints[i - 1].y;
        length += Math.sqrt(dx * dx + dy * dy);
    }
    return length;
}

function computeBoundingBox(curvePoints, controlPoints) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    // Include curve points
    curvePoints.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });

    // Control polygon bounding box
    let cpMinX = Infinity, cpMinY = Infinity;
    let cpMaxX = -Infinity, cpMaxY = -Infinity;
    controlPoints.forEach(p => {
        cpMinX = Math.min(cpMinX, p.x);
        cpMinY = Math.min(cpMinY, p.y);
        cpMaxX = Math.max(cpMaxX, p.x);
        cpMaxY = Math.max(cpMaxY, p.y);
    });

    return {
        curve: { minX, minY, maxX, maxY },
        controlPolygon: { minX: cpMinX, minY: cpMinY, maxX: cpMaxX, maxY: cpMaxY }
    };
}
