/**
 * Web Worker for Coordinate Descent
 */

// Test functions
// Note: For Coordinate Descent to be efficient, we often need gradients or closed-form minimization for each coordinate.
// Since we are building a general example, we will use line search (Golden Section) or simple gradient step along coordinate.
// "Lasso" example requires soft-thresholding operator if we want exact solution.

const FUNCTIONS = {
    quadratic: {
        name: 'Quadratic',
        f: (x) => {
            const [x1, y1] = x;
            return 2 * x1 * x1 + 3 * y1 * y1 - 4 * x1 + 6 * y1 + 10;
        },
        optimum: [1, -1],
        dim: 2
    },
    rosenbrock: {
        name: 'Rosenbrock',
        f: (x) => {
            const [x1, y1] = x;
            return (1 - x1) ** 2 + 100 * (y1 - x1 ** 2) ** 2;
        },
        optimum: [1, 1],
        dim: 2
    },
    rastrigin: {
        name: 'Rastrigin',
        f: (x) => {
            const n = x.length;
            let sum = 0;
            for (let i = 0; i < n; i++) {
                sum += x[i] ** 2 - 10 * Math.cos(2 * Math.PI * x[i]);
            }
            return 10 * n + sum;
        },
        optimum: [0, 0],
        dim: 2
    },
    lasso: {
        name: 'Lasso-like',
        f: (x) => {
            // Smooth part + L1 penalty
            // f(x,y) = (x-1)^2 + (y-2)^2 + lambda(|x| + |y|)
            const lambda = 1.0;
            const [x1, y1] = x;
            const smooth = (x1 - 1)**2 + (y1 - 2)**2;
            const reg = lambda * (Math.abs(x1) + Math.abs(y1));
            return smooth + reg;
        },
        // Optimum for (x-u)^2 + lambda|x| is soft_threshold(u, lambda/2)
        // For x: u=1, lambda=1 -> st(1, 0.5) = 1-0.5 = 0.5
        // For y: u=2, lambda=1 -> st(2, 0.5) = 2-0.5 = 1.5
        optimum: [0.5, 1.5],
        dim: 2
    }
};

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, updateRule, initPoint, maxIterations, stepSize } = data;

        const func = FUNCTIONS[functionType];
        if (!func) {
            throw new Error('Unknown function type');
        }

        reportProgress(5);

        const result = coordinateDescent(
            func.f,
            initPoint,
            updateRule,
            maxIterations,
            stepSize
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

// Simple Golden Section Search for line minimization along one coordinate
function lineSearchCoordinate(f, point, coordIndex, tol) {
    // Current value
    let currentX = point[coordIndex];

    // Bracket finding: Search in [current-5, current+5]
    let lower = currentX - 5.0;
    let upper = currentX + 5.0;

    const gr = (Math.sqrt(5) - 1) / 2;
    let c = upper - (upper - lower) * gr;
    let d = lower + (upper - lower) * gr;

    // Helper to evaluate f with modified coordinate
    const evalAt = (val) => {
        let p = point.slice();
        p[coordIndex] = val;
        return f(p);
    };

    while (Math.abs(upper - lower) > tol) {
        if (evalAt(c) < evalAt(d)) {
            upper = d;
            d = c;
            c = upper - (upper - lower) * gr;
        } else {
            lower = c;
            c = d;
            d = lower + (upper - lower) * gr;
        }
    }

    return (lower + upper) / 2;
}

function coordinateDescent(f, x0, updateRule, maxIter, tol) {
    const n = x0.length;
    let x = x0.slice();
    let converged = false;
    const history = [];

    history.push({
        iteration: 0,
        value: f(x),
        point: x.slice()
    });

    let iter = 0;
    // For greedy rule, we need to estimate gradient/improvement
    // Just simple finite difference for "steepest coordinate" estimation if greedy

    while (iter < maxIter) {
        iter++;
        reportProgress(Math.min(90, 5 + (iter / maxIter) * 85));

        const xBefore = x.slice();
        const fBefore = f(x);

        if (updateRule === 'cyclic') {
            for (let i = 0; i < n; i++) {
                x[i] = lineSearchCoordinate(f, x, i, tol);
                // Record intermediate steps? Usually CD records after full cycle or each step
                // Let's record each step to show the "staircase" path
                history.push({
                    iteration: iter,
                    subStep: i, // Optional
                    value: f(x),
                    point: x.slice()
                });
            }
        } else if (updateRule === 'random') {
            const i = Math.floor(Math.random() * n);
            x[i] = lineSearchCoordinate(f, x, i, tol);
            history.push({
                iteration: iter,
                value: f(x),
                point: x.slice()
            });
        } else if (updateRule === 'greedy') {
            // Find coordinate with biggest potential drop (expensive)
            let bestI = -1;
            let bestVal = fBefore;
            let bestCoordVal = x[0];

            for (let i = 0; i < n; i++) {
                const newCoord = lineSearchCoordinate(f, x, i, tol);
                const pTest = x.slice();
                pTest[i] = newCoord;
                const fTest = f(pTest);
                if (fTest < bestVal) {
                    bestVal = fTest;
                    bestI = i;
                    bestCoordVal = newCoord;
                }
            }

            if (bestI !== -1) {
                x[bestI] = bestCoordVal;
            }
            history.push({
                iteration: iter,
                value: f(x),
                point: x.slice()
            });
        }

        const fAfter = f(x);

        // Convergence check (on function value or parameter change)
        // Using tolerance passed as stepSize argument
        if (Math.abs(fBefore - fAfter) < tol) {
            converged = true;
            break;
        }
    }

    return {
        bestPoint: x,
        bestValue: f(x),
        iterations: iter,
        converged,
        history
    };
}
