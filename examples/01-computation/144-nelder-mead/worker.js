/**
 * Web Worker for Nelder-Mead Optimization
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
    sphere: {
        name: 'Sphere',
        f: (x) => {
            let sum = 0;
            for (let i = 0; i < x.length; i++) {
                sum += x[i] ** 2;
            }
            return sum;
        },
        optimum: [0, 0],
        dim: 2
    },
    ackley: {
        name: 'Ackley',
        f: (x) => {
            const [x1, y1] = x;
            return -20 * Math.exp(-0.2 * Math.sqrt(0.5 * (x1**2 + y1**2))) -
                   Math.exp(0.5 * (Math.cos(2 * Math.PI * x1) + Math.cos(2 * Math.PI * y1))) +
                   Math.E + 20;
        },
        optimum: [0, 0],
        dim: 2
    }
};

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, params, initPoint, maxIterations, tolerance } = data;

        const func = FUNCTIONS[functionType];
        if (!func) {
            throw new Error('Unknown function type');
        }

        reportProgress(5);

        const result = nelderMead(
            func.f,
            initPoint,
            params,
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

function nelderMead(f, x0, params, maxIter, tol) {
    const n = x0.length;
    const { alpha, gamma, rho, sigma } = params;

    // Initialize Simplex
    // x0 is the starting point. We need n+1 points.
    // Standard initialization: x_i = x0 + e_i * step
    // using step size proportional to max(1, |x0_i|)
    let simplex = [];
    simplex.push({ point: x0.slice(), value: f(x0) });

    const step = 0.05; // 5% perturbation
    for (let i = 0; i < n; i++) {
        let x = x0.slice();
        if (x[i] === 0) {
            x[i] = 0.00025;
        } else {
            x[i] = x[i] * (1 + step);
        }
        simplex.push({ point: x, value: f(x) });
    }

    let iterations = 0;
    let converged = false;
    let convergenceReason = 'max_iterations';
    const history = [];

    while (iterations < maxIter) {
        // 1. Order
        simplex.sort((a, b) => a.value - b.value);

        const best = simplex[0];
        const worst = simplex[n];
        const secondWorst = simplex[n - 1];

        // Record history
        if (iterations % Math.ceil(maxIter / 100) === 0 || iterations < 10) {
            history.push({
                iteration: iterations,
                value: best.value,
                point: best.point.slice()
            });
        }

        // Check convergence
        // Standard deviation of simplex values or simply range
        const range = worst.value - best.value;
        if (range < tol) {
            converged = true;
            convergenceReason = 'function_tolerance';
            break;
        }

        iterations++;
        reportProgress(Math.min(90, 5 + (iterations / maxIter) * 85));

        // 2. Centroid of the best n points (all except worst)
        let centroid = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                centroid[j] += simplex[i].point[j];
            }
        }
        for (let j = 0; j < n; j++) {
            centroid[j] /= n;
        }

        // 3. Reflection
        const xr = new Array(n);
        for (let j = 0; j < n; j++) {
            xr[j] = centroid[j] + alpha * (centroid[j] - worst.point[j]);
        }
        const fr = f(xr);

        if (best.value <= fr && fr < secondWorst.value) {
            // Replace worst with reflected
            simplex[n] = { point: xr, value: fr };
            continue;
        }

        // 4. Expansion
        if (fr < best.value) {
            const xe = new Array(n);
            for (let j = 0; j < n; j++) {
                xe[j] = centroid[j] + gamma * (xr[j] - centroid[j]);
            }
            const fe = f(xe);
            if (fe < fr) {
                simplex[n] = { point: xe, value: fe };
            } else {
                simplex[n] = { point: xr, value: fr };
            }
            continue;
        }

        // 5. Contraction
        if (fr >= secondWorst.value) {
            // Outside contraction
            if (fr < worst.value) {
                const xc = new Array(n);
                for (let j = 0; j < n; j++) {
                    xc[j] = centroid[j] + rho * (xr[j] - centroid[j]);
                }
                const fc = f(xc);
                if (fc <= fr) {
                    simplex[n] = { point: xc, value: fc };
                    continue;
                }
            } else {
                // Inside contraction
                const xc = new Array(n);
                for (let j = 0; j < n; j++) {
                    xc[j] = centroid[j] + rho * (worst.point[j] - centroid[j]);
                }
                const fc = f(xc);
                if (fc < worst.value) {
                    simplex[n] = { point: xc, value: fc };
                    continue;
                }
            }
        }

        // 6. Shrink
        for (let i = 1; i <= n; i++) {
            for (let j = 0; j < n; j++) {
                simplex[i].point[j] = best.point[j] + sigma * (simplex[i].point[j] - best.point[j]);
            }
            simplex[i].value = f(simplex[i].point);
        }
    }

    // Final sort
    simplex.sort((a, b) => a.value - b.value);

    return {
        bestPoint: simplex[0].point,
        bestValue: simplex[0].value,
        iterations,
        converged,
        convergenceReason,
        history
    };
}
