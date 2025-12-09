// RMSprop Optimizer Web Worker
// Implements RMSprop and optional SGD for comparison

// Test functions
const functions = {
    rosenbrock: {
        fn: (x, y) => Math.pow(1 - x, 2) + 100 * Math.pow(y - x * x, 2),
        grad: (x, y) => [
            -2 * (1 - x) - 400 * x * (y - x * x),
            200 * (y - x * x)
        ],
        bounds: { xMin: -2, xMax: 2, yMin: -1, yMax: 3 },
        optimum: [1, 1]
    },
    rastrigin: {
        fn: (x, y) => 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y),
        grad: (x, y) => [
            2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
            2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y)
        ],
        bounds: { xMin: -5.12, xMax: 5.12, yMin: -5.12, yMax: 5.12 },
        optimum: [0, 0]
    },
    sphere: {
        fn: (x, y) => x * x + y * y,
        grad: (x, y) => [2 * x, 2 * y],
        bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        optimum: [0, 0]
    },
    himmelblau: {
        fn: (x, y) => Math.pow(x * x + y - 11, 2) + Math.pow(x + y * y - 7, 2),
        grad: (x, y) => [
            4 * x * (x * x + y - 11) + 2 * (x + y * y - 7),
            2 * (x * x + y - 11) + 4 * y * (x + y * y - 7)
        ],
        bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        optimum: [3, 2] // One of four minima
    }
};

self.onmessage = function(e) {
    const { type, params } = e.data;

    if (type === 'optimize') {
        runRMSprop(params);
    } else if (type === 'compare') {
        runComparison(params);
    }
};

function runRMSprop(params) {
    const {
        functionName,
        learningRate,
        decayRate,
        epsilon,
        maxIter,
        tolerance,
        useMomentum,
        startX,
        startY
    } = params;

    const func = functions[functionName];
    if (!func) {
        self.postMessage({ type: 'error', message: 'Unknown function' });
        return;
    }

    const startTime = performance.now();
    const { bounds } = func;

    // Initialize position
    let x = startX !== undefined ? startX : bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
    let y = startY !== undefined ? startY : bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin);

    // RMSprop state
    let v = [0, 0];  // Running average of squared gradients

    // Momentum (if enabled)
    let velocity = [0, 0];
    const momentumCoef = 0.9;

    const path = [[x, y]];
    const lossHistory = [func.fn(x, y)];

    let converged = false;
    let iteration = 0;

    for (iteration = 1; iteration <= maxIter; iteration++) {
        // Compute gradients
        const grad = func.grad(x, y);

        // Update running average of squared gradients
        v[0] = decayRate * v[0] + (1 - decayRate) * grad[0] * grad[0];
        v[1] = decayRate * v[1] + (1 - decayRate) * grad[1] * grad[1];

        // Compute update
        let dx, dy;

        if (useMomentum) {
            // Nesterov momentum
            velocity[0] = momentumCoef * velocity[0] - learningRate * grad[0] / (Math.sqrt(v[0]) + epsilon);
            velocity[1] = momentumCoef * velocity[1] - learningRate * grad[1] / (Math.sqrt(v[1]) + epsilon);
            dx = velocity[0];
            dy = velocity[1];
        } else {
            dx = -learningRate * grad[0] / (Math.sqrt(v[0]) + epsilon);
            dy = -learningRate * grad[1] / (Math.sqrt(v[1]) + epsilon);
        }

        x += dx;
        y += dy;

        // Record path and loss
        path.push([x, y]);
        const loss = func.fn(x, y);
        lossHistory.push(loss);

        // Check convergence
        if (Math.sqrt(dx * dx + dy * dy) < tolerance) {
            converged = true;
            break;
        }

        // Report progress
        if (iteration % 100 === 0) {
            self.postMessage({
                type: 'progress',
                iteration,
                maxIter,
                percent: Math.round((iteration / maxIter) * 100),
                currentLoss: loss
            });
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        optimizer: 'rmsprop',
        path,
        lossHistory,
        finalPosition: [x, y],
        finalValue: func.fn(x, y),
        iterations: iteration,
        converged,
        bounds: func.bounds,
        optimum: func.optimum,
        executionTime: endTime - startTime
    });
}

function runComparison(params) {
    const {
        functionName,
        learningRate,
        decayRate,
        epsilon,
        maxIter,
        tolerance
    } = params;

    const func = functions[functionName];
    if (!func) {
        self.postMessage({ type: 'error', message: 'Unknown function' });
        return;
    }

    const { bounds } = func;

    // Use same starting point for both
    const startX = bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
    const startY = bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin);

    // Run RMSprop
    const rmspropResult = optimizeRMSprop(func, startX, startY, learningRate, decayRate, epsilon, maxIter, tolerance);

    // Run SGD with same learning rate
    const sgdResult = optimizeSGD(func, startX, startY, learningRate * 0.1, maxIter, tolerance);

    self.postMessage({
        type: 'comparison',
        rmsprop: rmspropResult,
        sgd: sgdResult,
        bounds: func.bounds,
        optimum: func.optimum
    });
}

function optimizeRMSprop(func, startX, startY, lr, decay, eps, maxIter, tol) {
    let x = startX, y = startY;
    let v = [0, 0];
    const path = [[x, y]];
    const lossHistory = [func.fn(x, y)];

    for (let i = 1; i <= maxIter; i++) {
        const grad = func.grad(x, y);
        v[0] = decay * v[0] + (1 - decay) * grad[0] * grad[0];
        v[1] = decay * v[1] + (1 - decay) * grad[1] * grad[1];

        const dx = -lr * grad[0] / (Math.sqrt(v[0]) + eps);
        const dy = -lr * grad[1] / (Math.sqrt(v[1]) + eps);

        x += dx;
        y += dy;

        path.push([x, y]);
        lossHistory.push(func.fn(x, y));

        if (Math.sqrt(dx * dx + dy * dy) < tol) break;
    }

    return { path, lossHistory, finalPosition: [x, y], finalValue: func.fn(x, y) };
}

function optimizeSGD(func, startX, startY, lr, maxIter, tol) {
    let x = startX, y = startY;
    const path = [[x, y]];
    const lossHistory = [func.fn(x, y)];

    for (let i = 1; i <= maxIter; i++) {
        const grad = func.grad(x, y);

        const dx = -lr * grad[0];
        const dy = -lr * grad[1];

        x += dx;
        y += dy;

        path.push([x, y]);
        lossHistory.push(func.fn(x, y));

        if (Math.sqrt(dx * dx + dy * dy) < tol) break;
    }

    return { path, lossHistory, finalPosition: [x, y], finalValue: func.fn(x, y) };
}
