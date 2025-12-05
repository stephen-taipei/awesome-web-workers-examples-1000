// L-BFGS (Limited-Memory BFGS) Optimization Web Worker
// Memory-efficient quasi-Newton method using two-loop recursion

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
    styblinski: {
        fn: (x, y) => 0.5 * (Math.pow(x, 4) - 16 * x * x + 5 * x + Math.pow(y, 4) - 16 * y * y + 5 * y),
        grad: (x, y) => [
            0.5 * (4 * Math.pow(x, 3) - 32 * x + 5),
            0.5 * (4 * Math.pow(y, 3) - 32 * y + 5)
        ],
        bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        optimum: [-2.903534, -2.903534]
    },
    levy: {
        fn: (x, y) => {
            const w1 = 1 + (x - 1) / 4;
            const w2 = 1 + (y - 1) / 4;
            return Math.pow(Math.sin(Math.PI * w1), 2) +
                   Math.pow(w1 - 1, 2) * (1 + 10 * Math.pow(Math.sin(Math.PI * w1 + 1), 2)) +
                   Math.pow(w2 - 1, 2) * (1 + Math.pow(Math.sin(2 * Math.PI * w2), 2));
        },
        grad: (x, y) => {
            const h = 1e-6;
            const f = functions.levy.fn;
            return [
                (f(x + h, y) - f(x - h, y)) / (2 * h),
                (f(x, y + h) - f(x, y - h)) / (2 * h)
            ];
        },
        bounds: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
        optimum: [1, 1]
    },
    ackley: {
        fn: (x, y) => {
            const a = 20, b = 0.2, c = 2 * Math.PI;
            return -a * Math.exp(-b * Math.sqrt(0.5 * (x * x + y * y))) -
                   Math.exp(0.5 * (Math.cos(c * x) + Math.cos(c * y))) + a + Math.E;
        },
        grad: (x, y) => {
            const h = 1e-6;
            const f = functions.ackley.fn;
            return [
                (f(x + h, y) - f(x - h, y)) / (2 * h),
                (f(x, y + h) - f(x, y - h)) / (2 * h)
            ];
        },
        bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        optimum: [0, 0]
    }
};

self.onmessage = function(e) {
    const { params } = e.data;
    runLBFGS(params);
};

function runLBFGS(params) {
    const { functionName, memorySize, maxIter, tolerance, initialStep } = params;

    const func = functions[functionName];
    if (!func) {
        self.postMessage({ type: 'error', message: 'Unknown function' });
        return;
    }

    const startTime = performance.now();
    const { bounds } = func;
    const m = memorySize; // Number of corrections to store

    // Initialize
    let x = bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
    let y = bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin);

    // Storage for L-BFGS
    const sHistory = []; // s_k = x_{k+1} - x_k
    const yHistory = []; // y_k = g_{k+1} - g_k
    const rhoHistory = []; // rho_k = 1 / (y_k^T s_k)

    const path = [[x, y]];
    const lossHistory = [func.fn(x, y)];

    let converged = false;
    let iteration = 0;
    let grad = func.grad(x, y);

    for (iteration = 1; iteration <= maxIter; iteration++) {
        const gradNorm = Math.sqrt(grad[0] * grad[0] + grad[1] * grad[1]);

        if (gradNorm < tolerance) {
            converged = true;
            break;
        }

        // Compute search direction using two-loop recursion
        const p = lbfgsTwoLoop(grad, sHistory, yHistory, rhoHistory);

        // Line search
        const alpha = wolfeLineSearch(func, x, y, p, grad, initialStep);

        // Store old values
        const xOld = x, yOld = y;
        const gradOld = [...grad];

        // Update position
        x = xOld + alpha * p[0];
        y = yOld + alpha * p[1];

        // New gradient
        grad = func.grad(x, y);

        // Compute s and y
        const s = [x - xOld, y - yOld];
        const yVec = [grad[0] - gradOld[0], grad[1] - gradOld[1]];

        // Compute rho
        const sy = s[0] * yVec[0] + s[1] * yVec[1];
        if (sy > 1e-10) {
            // Only update if curvature condition is satisfied
            sHistory.push(s);
            yHistory.push(yVec);
            rhoHistory.push(1 / sy);

            // Keep only last m corrections
            if (sHistory.length > m) {
                sHistory.shift();
                yHistory.shift();
                rhoHistory.shift();
            }
        }

        path.push([x, y]);
        lossHistory.push(func.fn(x, y));

        if (iteration % 25 === 0) {
            self.postMessage({
                type: 'progress',
                iteration,
                maxIter,
                percent: Math.round((iteration / maxIter) * 100),
                currentLoss: func.fn(x, y),
                gradNorm,
                memoryUsed: sHistory.length
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
        memoryUsed: sHistory.length,
        executionTime: endTime - startTime
    });
}

function lbfgsTwoLoop(grad, sHistory, yHistory, rhoHistory) {
    const k = sHistory.length;

    if (k === 0) {
        // No history yet, use steepest descent
        return [-grad[0], -grad[1]];
    }

    // q = grad
    let q = [...grad];
    const alpha = new Array(k);

    // First loop (backward)
    for (let i = k - 1; i >= 0; i--) {
        const s = sHistory[i];
        const rho = rhoHistory[i];
        alpha[i] = rho * (s[0] * q[0] + s[1] * q[1]);
        q[0] -= alpha[i] * yHistory[i][0];
        q[1] -= alpha[i] * yHistory[i][1];
    }

    // Initial Hessian approximation: H_0 = gamma * I
    const sLast = sHistory[k - 1];
    const yLast = yHistory[k - 1];
    const yy = yLast[0] * yLast[0] + yLast[1] * yLast[1];
    const sy = sLast[0] * yLast[0] + sLast[1] * yLast[1];
    const gamma = sy / yy;

    // r = H_0 * q = gamma * q
    let r = [gamma * q[0], gamma * q[1]];

    // Second loop (forward)
    for (let i = 0; i < k; i++) {
        const y = yHistory[i];
        const s = sHistory[i];
        const rho = rhoHistory[i];
        const beta = rho * (y[0] * r[0] + y[1] * r[1]);
        r[0] += s[0] * (alpha[i] - beta);
        r[1] += s[1] * (alpha[i] - beta);
    }

    // Search direction is -r
    return [-r[0], -r[1]];
}

function wolfeLineSearch(func, x, y, p, grad, initialStep) {
    const c1 = 1e-4;
    const c2 = 0.9;
    let alpha = initialStep;
    const maxLsIter = 25;

    const f0 = func.fn(x, y);
    const dg0 = grad[0] * p[0] + grad[1] * p[1];

    if (dg0 >= 0) {
        // Not a descent direction, use small step
        return 0.001;
    }

    for (let i = 0; i < maxLsIter; i++) {
        const xNew = x + alpha * p[0];
        const yNew = y + alpha * p[1];
        const fNew = func.fn(xNew, yNew);

        // Armijo condition
        if (fNew > f0 + c1 * alpha * dg0) {
            alpha *= 0.5;
            continue;
        }

        // Curvature condition
        const gradNew = func.grad(xNew, yNew);
        const dgNew = gradNew[0] * p[0] + gradNew[1] * p[1];

        if (dgNew < c2 * dg0) {
            alpha *= 2.0;
            if (alpha > 10) alpha = 10;
            continue;
        }

        break;
    }

    return Math.max(alpha, 1e-8);
}
