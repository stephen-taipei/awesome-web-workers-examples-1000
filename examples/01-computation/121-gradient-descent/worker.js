/**
 * Web Worker for Gradient Descent
 * Implements basic gradient descent with various learning rate schedules
 */

// Test functions and their gradients
const FUNCTIONS = {
    quadratic: {
        name: 'Quadratic',
        f: (x, y) => (x - 3) ** 2 + (y - 2) ** 2,
        grad: (x, y) => [2 * (x - 3), 2 * (y - 2)],
        optimum: [3, 2],
        optimumValue: 0
    },
    rosenbrock: {
        name: 'Rosenbrock',
        f: (x, y) => (1 - x) ** 2 + 100 * (y - x ** 2) ** 2,
        grad: (x, y) => [
            -2 * (1 - x) - 400 * x * (y - x ** 2),
            200 * (y - x ** 2)
        ],
        optimum: [1, 1],
        optimumValue: 0
    },
    himmelblau: {
        name: 'Himmelblau',
        f: (x, y) => (x ** 2 + y - 11) ** 2 + (x + y ** 2 - 7) ** 2,
        grad: (x, y) => [
            4 * x * (x ** 2 + y - 11) + 2 * (x + y ** 2 - 7),
            2 * (x ** 2 + y - 11) + 4 * y * (x + y ** 2 - 7)
        ],
        optimum: [3, 2], // One of four minima
        optimumValue: 0
    },
    rastrigin: {
        name: 'Rastrigin',
        f: (x, y) => 20 + (x ** 2 - 10 * Math.cos(2 * Math.PI * x)) +
                     (y ** 2 - 10 * Math.cos(2 * Math.PI * y)),
        grad: (x, y) => [
            2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
            2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y)
        ],
        optimum: [0, 0],
        optimumValue: 0
    },
    beale: {
        name: 'Beale',
        f: (x, y) => (1.5 - x + x * y) ** 2 + (2.25 - x + x * y ** 2) ** 2 +
                     (2.625 - x + x * y ** 3) ** 2,
        grad: (x, y) => {
            const t1 = 1.5 - x + x * y;
            const t2 = 2.25 - x + x * y ** 2;
            const t3 = 2.625 - x + x * y ** 3;
            return [
                2 * t1 * (-1 + y) + 2 * t2 * (-1 + y ** 2) + 2 * t3 * (-1 + y ** 3),
                2 * t1 * x + 2 * t2 * (2 * x * y) + 2 * t3 * (3 * x * y ** 2)
            ];
        },
        optimum: [3, 0.5],
        optimumValue: 0
    }
};

self.onmessage = function(e) {
    const { data } = e.data;
    const startTime = performance.now();

    try {
        const { functionType, learningRate, lrSchedule, initX, initY,
                maxIterations, tolerance } = data;

        const func = FUNCTIONS[functionType];
        if (!func) {
            throw new Error('Unknown function type');
        }

        reportProgress(5);

        // Run gradient descent
        const result = gradientDescent(
            func.f,
            func.grad,
            [initX, initY],
            learningRate,
            lrSchedule,
            maxIterations,
            tolerance
        );

        reportProgress(90);

        // Compute additional metrics
        const distanceToOptimum = Math.sqrt(
            (result.finalPoint[0] - func.optimum[0]) ** 2 +
            (result.finalPoint[1] - func.optimum[1]) ** 2
        );

        reportProgress(100);

        const executionTime = (performance.now() - startTime).toFixed(2);

        self.postMessage({
            type: 'result',
            result: {
                functionName: func.name,
                functionType,
                initialPoint: [initX, initY],
                finalPoint: result.finalPoint,
                finalValue: result.finalValue,
                iterations: result.iterations,
                converged: result.converged,
                convergenceReason: result.convergenceReason,
                history: result.history,
                learningRate,
                lrSchedule,
                optimum: func.optimum,
                optimumValue: func.optimumValue,
                distanceToOptimum,
                gradientNorm: result.gradientNorm
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

function gradientDescent(f, grad, initial, baseLR, schedule, maxIter, tol) {
    let x = initial.slice();
    const history = [{
        iteration: 0,
        point: x.slice(),
        value: f(x[0], x[1]),
        gradNorm: norm(grad(x[0], x[1])),
        lr: baseLR
    }];

    let converged = false;
    let convergenceReason = 'max_iterations';
    let iteration = 0;

    for (iteration = 1; iteration <= maxIter; iteration++) {
        // Get current learning rate
        const lr = getLearningRate(baseLR, schedule, iteration);

        // Compute gradient
        const g = grad(x[0], x[1]);
        const gradNorm = norm(g);

        // Check gradient convergence
        if (gradNorm < tol) {
            converged = true;
            convergenceReason = 'gradient_small';
            break;
        }

        // Update
        const xNew = [
            x[0] - lr * g[0],
            x[1] - lr * g[1]
        ];

        // Check for NaN/Inf (divergence)
        if (!isFinite(xNew[0]) || !isFinite(xNew[1])) {
            convergenceReason = 'diverged';
            break;
        }

        const fNew = f(xNew[0], xNew[1]);
        const fOld = f(x[0], x[1]);

        // Check function value convergence
        if (Math.abs(fNew - fOld) < tol) {
            converged = true;
            convergenceReason = 'function_stable';
            x = xNew;
            break;
        }

        // Check step size convergence
        const stepSize = norm([xNew[0] - x[0], xNew[1] - x[1]]);
        if (stepSize < tol) {
            converged = true;
            convergenceReason = 'step_small';
            x = xNew;
            break;
        }

        x = xNew;

        // Record history (sample if too many iterations)
        if (iteration <= 100 || iteration % Math.ceil(maxIter / 100) === 0) {
            history.push({
                iteration,
                point: x.slice(),
                value: f(x[0], x[1]),
                gradNorm,
                lr
            });
        }

        // Progress update
        if (iteration % Math.ceil(maxIter / 20) === 0) {
            reportProgress(5 + (iteration / maxIter) * 80);
        }
    }

    // Add final point if not already added
    if (history[history.length - 1].iteration !== iteration) {
        history.push({
            iteration,
            point: x.slice(),
            value: f(x[0], x[1]),
            gradNorm: norm(grad(x[0], x[1])),
            lr: getLearningRate(baseLR, schedule, iteration)
        });
    }

    return {
        finalPoint: x,
        finalValue: f(x[0], x[1]),
        iterations: iteration,
        converged,
        convergenceReason,
        history,
        gradientNorm: norm(grad(x[0], x[1]))
    };
}

function getLearningRate(baseLR, schedule, t) {
    switch (schedule) {
        case 'constant':
            return baseLR;
        case 'decay':
            return baseLR / (1 + 0.01 * t);
        case 'step':
            return baseLR * Math.pow(0.5, Math.floor(t / 200));
        case 'exponential':
            return baseLR * Math.pow(0.999, t);
        default:
            return baseLR;
    }
}

function norm(v) {
    return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}
