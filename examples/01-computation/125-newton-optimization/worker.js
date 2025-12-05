// Newton's Method Optimization Web Worker
// Second-order optimization using Hessian matrix

const functions = {
    rosenbrock: {
        fn: (x, y) => Math.pow(1 - x, 2) + 100 * Math.pow(y - x * x, 2),
        grad: (x, y) => [
            -2 * (1 - x) - 400 * x * (y - x * x),
            200 * (y - x * x)
        ],
        hessian: (x, y) => [
            [2 - 400 * (y - 3 * x * x), -400 * x],
            [-400 * x, 200]
        ],
        bounds: { xMin: -2, xMax: 2, yMin: -1, yMax: 3 },
        optimum: [1, 1]
    },
    quadratic: {
        fn: (x, y) => x * x + 4 * y * y,
        grad: (x, y) => [2 * x, 8 * y],
        hessian: (x, y) => [[2, 0], [0, 8]],
        bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        optimum: [0, 0]
    },
    booth: {
        fn: (x, y) => Math.pow(x + 2 * y - 7, 2) + Math.pow(2 * x + y - 5, 2),
        grad: (x, y) => [
            2 * (x + 2 * y - 7) + 4 * (2 * x + y - 5),
            4 * (x + 2 * y - 7) + 2 * (2 * x + y - 5)
        ],
        hessian: (x, y) => [[10, 8], [8, 10]],
        bounds: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
        optimum: [1, 3]
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
        hessian: (x, y) => {
            // Numerical approximation for complex Hessian
            const h = 1e-5;
            const g = (x, y) => {
                const t1 = 1.5 - x + x * y;
                const t2 = 2.25 - x + x * y * y;
                const t3 = 2.625 - x + x * y * y * y;
                return [
                    2 * t1 * (-1 + y) + 2 * t2 * (-1 + y * y) + 2 * t3 * (-1 + y * y * y),
                    2 * t1 * x + 2 * t2 * 2 * x * y + 2 * t3 * 3 * x * y * y
                ];
            };
            const gx = g(x, y);
            const gxh = g(x + h, y);
            const gyh = g(x, y + h);
            return [
                [(gxh[0] - gx[0]) / h, (gyh[0] - gx[0]) / h],
                [(gxh[1] - gx[1]) / h, (gyh[1] - gx[1]) / h]
            ];
        },
        bounds: { xMin: -4.5, xMax: 4.5, yMin: -4.5, yMax: 4.5 },
        optimum: [3, 0.5]
    }
};

self.onmessage = function(e) {
    const { params } = e.data;
    runNewton(params);
};

function runNewton(params) {
    const { functionName, maxIter, tolerance, stepSize, useLineSearch } = params;

    const func = functions[functionName];
    if (!func) {
        self.postMessage({ type: 'error', message: 'Unknown function' });
        return;
    }

    const startTime = performance.now();
    const { bounds } = func;

    // Random starting point
    let x = bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
    let y = bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin);

    const path = [[x, y]];
    const lossHistory = [func.fn(x, y)];
    const gradNormHistory = [];

    let converged = false;
    let iteration = 0;

    for (iteration = 1; iteration <= maxIter; iteration++) {
        const grad = func.grad(x, y);
        const H = func.hessian(x, y);

        // Compute gradient norm
        const gradNorm = Math.sqrt(grad[0] * grad[0] + grad[1] * grad[1]);
        gradNormHistory.push(gradNorm);

        // Check convergence
        if (gradNorm < tolerance) {
            converged = true;
            break;
        }

        // Solve H * d = -grad for Newton direction d
        // For 2x2: d = H^{-1} * (-grad)
        const det = H[0][0] * H[1][1] - H[0][1] * H[1][0];

        if (Math.abs(det) < 1e-12) {
            // Hessian is singular, fall back to gradient descent
            const dx = -stepSize * 0.01 * grad[0];
            const dy = -stepSize * 0.01 * grad[1];
            x += dx;
            y += dy;
        } else {
            // Inverse of 2x2 matrix
            const Hinv = [
                [H[1][1] / det, -H[0][1] / det],
                [-H[1][0] / det, H[0][0] / det]
            ];

            // Newton direction
            let dx = -(Hinv[0][0] * grad[0] + Hinv[0][1] * grad[1]);
            let dy = -(Hinv[1][0] * grad[0] + Hinv[1][1] * grad[1]);

            // Apply damping/step size
            let alpha = stepSize;

            // Optional backtracking line search
            if (useLineSearch) {
                const currentValue = func.fn(x, y);
                const c = 0.5;
                const rho = 0.5;

                for (let ls = 0; ls < 20; ls++) {
                    const newX = x + alpha * dx;
                    const newY = y + alpha * dy;
                    const newValue = func.fn(newX, newY);

                    // Armijo condition
                    if (newValue <= currentValue + c * alpha * (grad[0] * dx + grad[1] * dy)) {
                        break;
                    }
                    alpha *= rho;
                }
            }

            x += alpha * dx;
            y += alpha * dy;
        }

        path.push([x, y]);
        lossHistory.push(func.fn(x, y));

        // Progress report
        if (iteration % 10 === 0) {
            self.postMessage({
                type: 'progress',
                iteration,
                maxIter,
                percent: Math.round((iteration / maxIter) * 100),
                currentLoss: func.fn(x, y),
                gradNorm
            });
        }
    }

    const endTime = performance.now();
    const finalGrad = func.grad(x, y);

    self.postMessage({
        type: 'result',
        path,
        lossHistory,
        gradNormHistory,
        finalPosition: [x, y],
        finalValue: func.fn(x, y),
        finalGradNorm: Math.sqrt(finalGrad[0] * finalGrad[0] + finalGrad[1] * finalGrad[1]),
        iterations: iteration,
        converged,
        bounds: func.bounds,
        optimum: func.optimum,
        executionTime: endTime - startTime
    });
}
