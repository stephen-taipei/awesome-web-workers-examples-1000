// BFGS Quasi-Newton Optimization Web Worker

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
    sphere: {
        fn: (x, y) => x * x + y * y,
        grad: (x, y) => [2 * x, 2 * y],
        bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        optimum: [0, 0]
    },
    booth: {
        fn: (x, y) => Math.pow(x + 2 * y - 7, 2) + Math.pow(2 * x + y - 5, 2),
        grad: (x, y) => [
            2 * (x + 2 * y - 7) + 4 * (2 * x + y - 5),
            4 * (x + 2 * y - 7) + 2 * (2 * x + y - 5)
        ],
        bounds: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
        optimum: [1, 3]
    },
    matyas: {
        fn: (x, y) => 0.26 * (x * x + y * y) - 0.48 * x * y,
        grad: (x, y) => [0.52 * x - 0.48 * y, 0.52 * y - 0.48 * x],
        bounds: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
        optimum: [0, 0]
    }
};

self.onmessage = function(e) {
    const { params } = e.data;
    runBFGS(params);
};

function runBFGS(params) {
    const { functionName, maxIter, tolerance, lineSearchType, c1 } = params;

    const func = functions[functionName];
    if (!func) {
        self.postMessage({ type: 'error', message: 'Unknown function' });
        return;
    }

    const startTime = performance.now();
    const { bounds } = func;

    // Initialize
    let x = bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
    let y = bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin);

    // Initial inverse Hessian approximation (identity matrix)
    let H = [[1, 0], [0, 1]];

    const path = [[x, y]];
    const lossHistory = [func.fn(x, y)];

    let converged = false;
    let iteration = 0;

    for (iteration = 1; iteration <= maxIter; iteration++) {
        const grad = func.grad(x, y);
        const gradNorm = Math.sqrt(grad[0] * grad[0] + grad[1] * grad[1]);

        if (gradNorm < tolerance) {
            converged = true;
            break;
        }

        // Search direction: p = -H * grad
        const p = [
            -(H[0][0] * grad[0] + H[0][1] * grad[1]),
            -(H[1][0] * grad[0] + H[1][1] * grad[1])
        ];

        // Line search
        let alpha;
        if (lineSearchType === 'wolfe') {
            alpha = wolfeLineSearch(func, x, y, p, grad, c1);
        } else {
            alpha = backtrackingLineSearch(func, x, y, p, grad, c1);
        }

        // Store old position and gradient
        const xOld = x, yOld = y;
        const gradOld = [...grad];

        // Update position
        x = xOld + alpha * p[0];
        y = yOld + alpha * p[1];

        // Get new gradient
        const gradNew = func.grad(x, y);

        // Compute s and y for BFGS update
        const s = [x - xOld, y - yOld];
        const yVec = [gradNew[0] - gradOld[0], gradNew[1] - gradOld[1]];

        // Update inverse Hessian approximation
        H = bfgsUpdate(H, s, yVec);

        path.push([x, y]);
        lossHistory.push(func.fn(x, y));

        if (iteration % 20 === 0) {
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

function bfgsUpdate(H, s, y) {
    // BFGS update formula for inverse Hessian
    const rho = 1 / (y[0] * s[0] + y[1] * s[1]);

    if (!isFinite(rho) || Math.abs(rho) > 1e10) {
        return H; // Skip update if curvature condition not satisfied
    }

    // I - rho * s * y^T
    const A = [
        [1 - rho * s[0] * y[0], -rho * s[0] * y[1]],
        [-rho * s[1] * y[0], 1 - rho * s[1] * y[1]]
    ];

    // I - rho * y * s^T
    const B = [
        [1 - rho * y[0] * s[0], -rho * y[0] * s[1]],
        [-rho * y[1] * s[0], 1 - rho * y[1] * s[1]]
    ];

    // A * H * B + rho * s * s^T
    const AH = matMul2x2(A, H);
    const AHB = matMul2x2(AH, B);

    return [
        [AHB[0][0] + rho * s[0] * s[0], AHB[0][1] + rho * s[0] * s[1]],
        [AHB[1][0] + rho * s[1] * s[0], AHB[1][1] + rho * s[1] * s[1]]
    ];
}

function matMul2x2(A, B) {
    return [
        [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
        [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]
    ];
}

function wolfeLineSearch(func, x, y, p, grad, c1) {
    const c2 = 0.9;
    let alpha = 1;
    const maxLsIter = 25;

    const f0 = func.fn(x, y);
    const dg0 = grad[0] * p[0] + grad[1] * p[1]; // Directional derivative

    for (let i = 0; i < maxLsIter; i++) {
        const xNew = x + alpha * p[0];
        const yNew = y + alpha * p[1];
        const fNew = func.fn(xNew, yNew);

        // Sufficient decrease (Armijo)
        if (fNew > f0 + c1 * alpha * dg0) {
            alpha *= 0.5;
            continue;
        }

        // Curvature condition
        const gradNew = func.grad(xNew, yNew);
        const dgNew = gradNew[0] * p[0] + gradNew[1] * p[1];

        if (dgNew < c2 * dg0) {
            alpha *= 1.5;
            continue;
        }

        break;
    }

    return Math.max(alpha, 1e-8);
}

function backtrackingLineSearch(func, x, y, p, grad, c1) {
    let alpha = 1;
    const rho = 0.5;
    const maxLsIter = 20;

    const f0 = func.fn(x, y);
    const dg0 = grad[0] * p[0] + grad[1] * p[1];

    for (let i = 0; i < maxLsIter; i++) {
        const xNew = x + alpha * p[0];
        const yNew = y + alpha * p[1];
        const fNew = func.fn(xNew, yNew);

        if (fNew <= f0 + c1 * alpha * dg0) {
            break;
        }

        alpha *= rho;
    }

    return Math.max(alpha, 1e-8);
}
