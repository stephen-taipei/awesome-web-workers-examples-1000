/**
 * Web Worker for Subgradient Method
 */

// Test functions with subgradients
const FUNCTIONS = {
    abs: {
        name: 'Absolute Value Sum',
        f: (x) => Math.abs(x[0]) + Math.abs(x[1]),
        subgrad: (x) => [
            Math.sign(x[0]) === 0 ? (Math.random() - 0.5) : Math.sign(x[0]), // Random subgradient at 0
            Math.sign(x[1]) === 0 ? (Math.random() - 0.5) : Math.sign(x[1])
        ],
        optimum: [0, 0],
        dim: 2
    },
    hinge: {
        name: 'Hinge Loss',
        // max(0, 1-x) + max(0, 1-y)
        f: (x) => Math.max(0, 1 - x[0]) + Math.max(0, 1 - x[1]),
        subgrad: (x) => [
            (1 - x[0] > 0) ? -1 : (1 - x[0] < 0 ? 0 : (Math.random() > 0.5 ? -1 : 0)),
            (1 - x[1] > 0) ? -1 : (1 - x[1] < 0 ? 0 : (Math.random() > 0.5 ? -1 : 0))
        ],
        optimum: [1, 1], // Actually any x>=1, y>=1 gives 0. Let's say [1,1] is closest "corner"
        dim: 2
    },
    max_component: {
        name: 'Max Component',
        f: (x) => Math.max(Math.abs(x[0]), Math.abs(x[1])),
        subgrad: (x) => {
            const abs0 = Math.abs(x[0]);
            const abs1 = Math.abs(x[1]);
            if (abs0 > abs1) {
                return [Math.sign(x[0]), 0];
            } else if (abs1 > abs0) {
                return [0, Math.sign(x[1])];
            } else {
                // At intersection, convex hull of gradients.
                // e.g., 0.5 * grad1 + 0.5 * grad2
                return [0.5 * Math.sign(x[0]), 0.5 * Math.sign(x[1])];
            }
        },
        optimum: [0, 0],
        dim: 2
    },
    l1_regularized: {
        name: 'L1 Regularized Quadratic',
        // (x-1)^2 + (y-1)^2 + |x| + |y|
        f: (x) => (x[0] - 1)**2 + (x[1] - 1)**2 + Math.abs(x[0]) + Math.abs(x[1]),
        subgrad: (x) => [
            2 * (x[0] - 1) + Math.sign(x[0]),
            2 * (x[1] - 1) + Math.sign(x[1])
        ],
        // grad smooth + subgrad non-smooth
        // 2(x-1) + sign(x) = 0 => 2x - 2 + 1 = 0 (if x>0) => 2x=1 => x=0.5
        optimum: [0.5, 0.5],
        dim: 2
    }
};

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, stepRule, stepParam, initPoint, maxIterations } = data;

        const func = FUNCTIONS[functionType];
        if (!func) {
            throw new Error('Unknown function type');
        }

        reportProgress(5);

        const result = subgradientMethod(
            func.f,
            func.subgrad,
            initPoint,
            stepRule,
            stepParam,
            maxIterations
        );

        reportProgress(90);

        // Calculate distance to optimum
        let dist = 0;
        if (func.optimum) {
            // For hinge loss, optimum is a set. Just measure dist to [1,1] if x<1
            if (functionType === 'hinge') {
                const dx = result.bestPoint[0] < 1 ? 1 - result.bestPoint[0] : 0;
                const dy = result.bestPoint[1] < 1 ? 1 - result.bestPoint[1] : 0;
                dist = Math.sqrt(dx*dx + dy*dy);
            } else {
                for(let i=0; i<func.dim; i++) {
                    dist += (result.bestPoint[i] - func.optimum[i])**2;
                }
                dist = Math.sqrt(dist);
            }
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
                history: result.history,
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

function getStepSize(rule, a, k) {
    // k is iteration count (1-based)
    switch(rule) {
        case 'constant':
            return a;
        case 'decay_sqrt':
            return a / Math.sqrt(k);
        case 'decay_linear':
            return a / k;
        default:
            return a / k;
    }
}

function subgradientMethod(f, subgrad, x0, stepRule, stepParam, maxIter) {
    let x = x0.slice();
    let bestX = x.slice();
    let bestVal = f(x);

    const history = [];
    history.push({
        iteration: 0,
        value: bestVal,
        bestValue: bestVal,
        point: x.slice()
    });

    for (let k = 1; k <= maxIter; k++) {
        const g = subgrad(x);
        const gNorm = Math.sqrt(g[0]*g[0] + g[1]*g[1]);

        // Step size
        // Standard rule: alpha_k = step_size / ||g|| (normalized subgradient descent)
        // or just alpha_k * g
        // Let's use standard form: x_{k+1} = x_k - alpha_k * g / ||g|| if we want controlled step length
        // OR standard subgradient: x_{k+1} = x_k - alpha_k * g

        // If g is 0, we are done (0 is in subgradient)
        if (gNorm < 1e-12) {
            break;
        }

        const alpha = getStepSize(stepRule, stepParam, k);

        // Normalized step usually behaves more predictably with these decay rules
        const stepX = (g[0] / gNorm) * alpha;
        const stepY = (g[1] / gNorm) * alpha;

        x[0] -= stepX;
        x[1] -= stepY;

        const val = f(x);

        // Keep track of best so far (as subgradient method is not descent method)
        if (val < bestVal) {
            bestVal = val;
            bestX = x.slice();
        }

        if (k % Math.ceil(maxIter / 100) === 0 || k < 20) {
            history.push({
                iteration: k,
                value: val,
                bestValue: bestVal,
                point: x.slice()
            });
        }

        if (k % Math.ceil(maxIter / 20) === 0) {
            reportProgress(5 + (k / maxIter) * 85);
        }
    }

    return {
        bestPoint: bestX,
        bestValue: bestVal,
        iterations: maxIter,
        history
    };
}
