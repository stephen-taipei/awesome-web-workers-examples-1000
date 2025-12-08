/**
 * Web Worker for Powell's Method
 */

// Test functions
const FUNCTIONS = {
    rosenbrock: {
        name: 'Rosenbrock',
        f: (x) => {
            const [x1, y1] = x;
            return (1 - x1) ** 2 + 100 * (y1 - x1 ** 2) ** 2;
        },
        optimum: [1, 1],
        dim: 2
    },
    himmelblau: {
        name: 'Himmelblau',
        f: (x) => {
            const [x1, y1] = x;
            return (x1 ** 2 + y1 - 11) ** 2 + (x1 + y1 ** 2 - 7) ** 2;
        },
        optimum: [3, 2], // One of them
        dim: 2
    },
    quadratic: {
        name: 'Quadratic Bowl',
        f: (x) => {
            const [x1, y1] = x;
            return 2 * x1 * x1 + 3 * y1 * y1 - 4 * x1 * y1 - 2 * x1 + 10;
        },
        optimum: [3, 2], // Approximate
        dim: 2
    },
    wood: {
        name: 'Wood Function (Projected)',
        f: (x) => {
            // Wood function is 4D. Let's fix x3=1, x4=1 for 2D visualization
            // f(x1, x2, x3, x4)
            const x1 = x[0], x2 = x[1], x3 = 1, x4 = 1;
            const t1 = x2 - x1**2;
            const t2 = 1 - x1;
            const t3 = x4 - x3**2;
            const t4 = 1 - x3;
            const t5 = x2 + x4 - 2;
            const t6 = x2 - x4;
            return 100 * t1**2 + t2**2 + 90 * t3**2 + t4**2 + 10.1 * (t5**2 + t3**2) + 19.8 * t5 * t3; // Note: Simplified or projected logic
            // Actually, let's just use standard 2D projection or different function.
            // Let's stick to 4D implementation but input is 2D, padded with 1s.
        },
        optimum: [1, 1],
        dim: 2
    }
};

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, initPoint, lineTol, maxIterations, tolerance } = data;

        const func = FUNCTIONS[functionType];
        if (!func) {
            throw new Error('Unknown function type');
        }

        reportProgress(5);

        const result = powellMethod(
            func.f,
            initPoint,
            lineTol,
            maxIterations,
            tolerance
        );

        reportProgress(90);

        // Calculate distance to optimum
        let dist = 0;
        if (func.optimum) {
            for(let i=0; i<func.dim; i++) {
                dist += (result.bestPoint[i] - func.optimum[i])**2;
            }
            dist = Math.sqrt(dist);
        }

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                functionName: func.name,
                initialPoint: initPoint,
                finalPoint: result.bestPoint,
                finalValue: result.bestValue,
                iterations: result.iterations,
                converged: result.converged,
                convergenceReason: result.convergenceReason,
                history: result.history,
                optimum: func.optimum,
                distanceToOptimum: dist
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

// Golden Section Search for line minimization
function lineSearch(f, point, direction, tol) {
    // Bracket the minimum
    let alpha = 0;
    let step = 1.0;

    // 1. Find a bracket [a, b]
    let a = alpha, b = alpha + step;
    let fa = f(point.map((v, i) => v + a * direction[i]));
    let fb = f(point.map((v, i) => v + b * direction[i]));

    // Expand if going downhill
    if (fb < fa) {
        // Expand b
        let c = b + step;
        let fc = f(point.map((v, i) => v + c * direction[i]));
        while (fc < fb) {
            a = b; fa = fb;
            b = c; fb = fc;
            step *= 2;
            c = b + step;
            fc = f(point.map((v, i) => v + c * direction[i]));
        }
        // Now minimum is between a and c
        b = c; // fb is actually fc now, but we just need a bracket
    } else {
        // Go backwards? Assume starting close to min or downhill
        // Simple search: Golden Section
    }

    // Usually we want a proper bracket. For simplicity, let's assume [-10, 10] relative search space
    // or use a robust line search. Here is a simple Golden Section Search in [-5, 5] range along direction.
    // Better: Brent's method. For this example: Golden Section.

    const gr = (Math.sqrt(5) - 1) / 2;
    let lower = -20;
    let upper = 20;

    let c = upper - (upper - lower) * gr;
    let d = lower + (upper - lower) * gr;

    while (Math.abs(upper - lower) > tol) {
        let fc = f(point.map((v, i) => v + c * direction[i]));
        let fd = f(point.map((v, i) => v + d * direction[i]));

        if (fc < fd) {
            upper = d;
            d = c;
            c = upper - (upper - lower) * gr;
        } else {
            lower = c;
            c = d;
            d = lower + (upper - lower) * gr;
        }
    }

    const bestAlpha = (lower + upper) / 2;
    const newPoint = point.map((v, i) => v + bestAlpha * direction[i]);
    const newVal = f(newPoint);

    return { point: newPoint, value: newVal };
}

function powellMethod(f, x0, lineTol, maxIter, tol) {
    const n = x0.length;
    let p = x0.slice(); // Current point
    let directions = []; // Direction set (initially unit vectors)

    for (let i = 0; i < n; i++) {
        let d = new Array(n).fill(0);
        d[i] = 1;
        directions.push(d);
    }

    let iterations = 0;
    let converged = false;
    let convergenceReason = 'max_iterations';
    const history = [];

    history.push({
        iteration: 0,
        value: f(p),
        point: p.slice()
    });

    while (iterations < maxIter) {
        iterations++;
        reportProgress(Math.min(90, 5 + (iterations / maxIter) * 85));

        const pStart = p.slice();
        const fStart = f(p);

        let maxDelta = 0;
        let maxDeltaIndex = -1;

        // Minimize along each direction
        for (let i = 0; i < n; i++) {
            const fBefore = f(p);
            const res = lineSearch(f, p, directions[i], lineTol);
            p = res.point;
            const fAfter = res.value;

            const delta = fBefore - fAfter;
            if (delta > maxDelta) {
                maxDelta = delta;
                maxDeltaIndex = i;
            }
        }

        const fEnd = f(p);

        // Check convergence
        if (Math.abs(fStart - fEnd) < tol) {
            converged = true;
            convergenceReason = 'function_tolerance';
            history.push({
                iteration: iterations,
                value: fEnd,
                point: p.slice()
            });
            break;
        }

        // Calculate reflection point
        const pExtrapolated = new Array(n);
        for (let i = 0; i < n; i++) {
            pExtrapolated[i] = 2 * p[i] - pStart[i];
        }
        const fExtrapolated = f(pExtrapolated);

        // Update direction set logic (simplified Powell's)
        if (fExtrapolated < fStart) {
            // New direction
            const newDir = new Array(n);
            for (let i = 0; i < n; i++) {
                newDir[i] = p[i] - pStart[i];
            }

            // Perform line search along new direction
            const res = lineSearch(f, p, newDir, lineTol);
            p = res.point;

            // Replace direction of largest decrease with new direction
            // (Standard Powell, but there are modified versions to prevent linear dependence)
            if (maxDeltaIndex !== -1) {
                directions[maxDeltaIndex] = newDir;
                // Alternatively, throw away first and append new?
                // directions.shift(); directions.push(newDir);
            }
        }

        history.push({
            iteration: iterations,
            value: f(p),
            point: p.slice()
        });
    }

    return {
        bestPoint: p,
        bestValue: f(p),
        iterations,
        converged,
        convergenceReason,
        history
    };
}
