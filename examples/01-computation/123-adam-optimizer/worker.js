// Adam Optimizer Web Worker
// Implements Adam (Adaptive Moment Estimation) optimization algorithm

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
    beale: {
        fn: (x, y) => Math.pow(1.5 - x + x * y, 2) + Math.pow(2.25 - x + x * y * y, 2) + Math.pow(2.625 - x + x * y * y * y, 2),
        grad: (x, y) => {
            const t1 = 1.5 - x + x * y;
            const t2 = 2.25 - x + x * y * y;
            const t3 = 2.625 - x + x * y * y * y;
            return [
                2 * t1 * (-1 + y) + 2 * t2 * (-1 + y * y) + 2 * t3 * (-1 + y * y * y),
                2 * t1 * x + 2 * t2 * 2 * x * y + 2 * t3 * 3 * x * y * y
            ];
        },
        bounds: { xMin: -4.5, xMax: 4.5, yMin: -4.5, yMax: 4.5 },
        optimum: [3, 0.5]
    }
};

self.onmessage = function(e) {
    const { params } = e.data;
    runAdam(params);
};

function runAdam(params) {
    const {
        functionName,
        learningRate,
        beta1,
        beta2,
        epsilon,
        maxIter,
        tolerance
    } = params;

    const func = functions[functionName];
    if (!func) {
        self.postMessage({ type: 'error', message: 'Unknown function' });
        return;
    }

    const startTime = performance.now();

    // Initialize position randomly within bounds
    const { bounds } = func;
    let x = bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
    let y = bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin);

    // Initialize moments
    let m = [0, 0];  // First moment
    let v = [0, 0];  // Second moment

    const path = [[x, y]];
    const lossHistory = [func.fn(x, y)];

    let converged = false;
    let iteration = 0;

    for (iteration = 1; iteration <= maxIter; iteration++) {
        // Compute gradients
        const grad = func.grad(x, y);

        // Update biased first moment estimate
        m[0] = beta1 * m[0] + (1 - beta1) * grad[0];
        m[1] = beta1 * m[1] + (1 - beta1) * grad[1];

        // Update biased second raw moment estimate
        v[0] = beta2 * v[0] + (1 - beta2) * grad[0] * grad[0];
        v[1] = beta2 * v[1] + (1 - beta2) * grad[1] * grad[1];

        // Bias-corrected estimates
        const mHat = [
            m[0] / (1 - Math.pow(beta1, iteration)),
            m[1] / (1 - Math.pow(beta1, iteration))
        ];
        const vHat = [
            v[0] / (1 - Math.pow(beta2, iteration)),
            v[1] / (1 - Math.pow(beta2, iteration))
        ];

        // Update parameters
        const dx = learningRate * mHat[0] / (Math.sqrt(vHat[0]) + epsilon);
        const dy = learningRate * mHat[1] / (Math.sqrt(vHat[1]) + epsilon);

        x -= dx;
        y -= dy;

        // Record path and loss
        path.push([x, y]);
        const loss = func.fn(x, y);
        lossHistory.push(loss);

        // Check convergence
        if (Math.sqrt(dx * dx + dy * dy) < tolerance) {
            converged = true;
            break;
        }

        // Report progress every 50 iterations
        if (iteration % 50 === 0) {
            self.postMessage({
                type: 'progress',
                iteration,
                maxIter,
                percent: Math.round((iteration / maxIter) * 100),
                currentLoss: loss,
                position: [x, y]
            });
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
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
