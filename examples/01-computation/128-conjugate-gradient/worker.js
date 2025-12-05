// Conjugate Gradient Method Web Worker

const functions = {
    rosenbrock: {
        fn: (x, y) => Math.pow(1 - x, 2) + 100 * Math.pow(y - x * x, 2),
        grad: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
        bounds: { xMin: -2, xMax: 2, yMin: -1, yMax: 3 },
        optimum: [1, 1]
    },
    quadratic: {
        fn: (x, y) => x * x + 4 * y * y + 0.5 * x * y,
        grad: (x, y) => [2 * x + 0.5 * y, 8 * y + 0.5 * x],
        bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        optimum: [0, 0]
    },
    beale: {
        fn: (x, y) => Math.pow(1.5 - x + x * y, 2) + Math.pow(2.25 - x + x * y * y, 2) + Math.pow(2.625 - x + x * y * y * y, 2),
        grad: (x, y) => {
            const t1 = 1.5 - x + x * y, t2 = 2.25 - x + x * y * y, t3 = 2.625 - x + x * y * y * y;
            return [
                2 * t1 * (-1 + y) + 2 * t2 * (-1 + y * y) + 2 * t3 * (-1 + y * y * y),
                2 * t1 * x + 2 * t2 * 2 * x * y + 2 * t3 * 3 * x * y * y
            ];
        },
        bounds: { xMin: -4.5, xMax: 4.5, yMin: -4.5, yMax: 4.5 },
        optimum: [3, 0.5]
    },
    sphere: {
        fn: (x, y) => x * x + y * y,
        grad: (x, y) => [2 * x, 2 * y],
        bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        optimum: [0, 0]
    }
};

self.onmessage = function(e) {
    const { params } = e.data;
    runCG(params);
};

function runCG(params) {
    const { functionName, betaMethod, maxIter, tolerance, restartFreq } = params;
    const func = functions[functionName];
    if (!func) { self.postMessage({ type: 'error', message: 'Unknown function' }); return; }

    const startTime = performance.now();
    const { bounds } = func;

    let x = bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
    let y = bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin);

    let grad = func.grad(x, y);
    let d = [-grad[0], -grad[1]]; // Initial direction = steepest descent

    const path = [[x, y]];
    const lossHistory = [func.fn(x, y)];

    let converged = false;
    let iteration = 0;
    let restartCount = 0;

    for (iteration = 1; iteration <= maxIter; iteration++) {
        const gradNorm = Math.sqrt(grad[0] * grad[0] + grad[1] * grad[1]);
        if (gradNorm < tolerance) { converged = true; break; }

        // Line search
        const alpha = wolfeLineSearch(func, x, y, d, grad);

        // Update position
        const xNew = x + alpha * d[0];
        const yNew = y + alpha * d[1];

        // New gradient
        const gradNew = func.grad(xNew, yNew);

        // Compute beta
        let beta = computeBeta(grad, gradNew, d, betaMethod);

        // Restart conditions
        const shouldRestart = (restartFreq > 0 && iteration % restartFreq === 0) ||
                              beta < 0 ||
                              Math.abs(gradNew[0] * grad[0] + gradNew[1] * grad[1]) / (gradNorm * gradNorm) > 0.1;

        if (shouldRestart) {
            d = [-gradNew[0], -gradNew[1]];
            restartCount++;
        } else {
            d = [-gradNew[0] + beta * d[0], -gradNew[1] + beta * d[1]];
        }

        x = xNew; y = yNew;
        grad = gradNew;

        path.push([x, y]);
        lossHistory.push(func.fn(x, y));

        if (iteration % 25 === 0) {
            self.postMessage({
                type: 'progress', iteration, maxIter,
                percent: Math.round((iteration / maxIter) * 100),
                currentLoss: func.fn(x, y), gradNorm
            });
        }
    }

    self.postMessage({
        type: 'result', path, lossHistory,
        finalPosition: [x, y], finalValue: func.fn(x, y),
        iterations: iteration, converged, restartCount,
        bounds: func.bounds, optimum: func.optimum,
        executionTime: performance.now() - startTime
    });
}

function computeBeta(gradOld, gradNew, d, method) {
    const gnOld = gradOld[0] * gradOld[0] + gradOld[1] * gradOld[1];
    const gnNew = gradNew[0] * gradNew[0] + gradNew[1] * gradNew[1];
    const diff = [gradNew[0] - gradOld[0], gradNew[1] - gradOld[1]];

    switch (method) {
        case 'fr': // Fletcher-Reeves
            return gnNew / gnOld;
        case 'pr': // Polak-Ribière
            return Math.max(0, (gradNew[0] * diff[0] + gradNew[1] * diff[1]) / gnOld);
        case 'hs': // Hestenes-Stiefel
            const denom = d[0] * diff[0] + d[1] * diff[1];
            return denom !== 0 ? (gradNew[0] * diff[0] + gradNew[1] * diff[1]) / denom : 0;
        default:
            return gnNew / gnOld;
    }
}

function wolfeLineSearch(func, x, y, d, grad) {
    const c1 = 1e-4, c2 = 0.1;
    let alpha = 1;
    const f0 = func.fn(x, y);
    const dg0 = grad[0] * d[0] + grad[1] * d[1];

    if (dg0 >= 0) return 0.001;

    for (let i = 0; i < 25; i++) {
        const xNew = x + alpha * d[0], yNew = y + alpha * d[1];
        const fNew = func.fn(xNew, yNew);

        if (fNew > f0 + c1 * alpha * dg0) { alpha *= 0.5; continue; }

        const gNew = func.grad(xNew, yNew);
        const dgNew = gNew[0] * d[0] + gNew[1] * d[1];
        if (dgNew < c2 * dg0) { alpha *= 1.5; continue; }
        break;
    }
    return Math.max(alpha, 1e-8);
}
