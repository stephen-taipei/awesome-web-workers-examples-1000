// Simulated Annealing Web Worker

const functions = {
    rastrigin: {
        fn: (x, y) => 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y),
        bounds: { xMin: -5.12, xMax: 5.12, yMin: -5.12, yMax: 5.12 },
        optimum: [0, 0],
        optimalValue: 0
    },
    ackley: {
        fn: (x, y) => {
            const a = 20, b = 0.2, c = 2 * Math.PI;
            return -a * Math.exp(-b * Math.sqrt(0.5 * (x * x + y * y)))
                   - Math.exp(0.5 * (Math.cos(c * x) + Math.cos(c * y))) + a + Math.E;
        },
        bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        optimum: [0, 0],
        optimalValue: 0
    },
    rosenbrock: {
        fn: (x, y) => Math.pow(1 - x, 2) + 100 * Math.pow(y - x * x, 2),
        bounds: { xMin: -2, xMax: 2, yMin: -1, yMax: 3 },
        optimum: [1, 1],
        optimalValue: 0
    },
    schwefel: {
        fn: (x, y) => 418.9829 * 2 - x * Math.sin(Math.sqrt(Math.abs(x))) - y * Math.sin(Math.sqrt(Math.abs(y))),
        bounds: { xMin: -500, xMax: 500, yMin: -500, yMax: 500 },
        optimum: [420.9687, 420.9687],
        optimalValue: 0
    }
};

self.onmessage = function(e) {
    const { params } = e.data;
    runSA(params);
};

function runSA(params) {
    const { functionName, coolingSchedule, initialTemp, minTemp, coolingRate, maxIter, stepSize } = params;
    const func = functions[functionName];
    if (!func) { self.postMessage({ type: 'error', message: 'Unknown function' }); return; }

    const { bounds } = func;
    const startTime = performance.now();

    // Initialize
    let x = bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin);
    let y = bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin);
    let currentEnergy = func.fn(x, y);

    let bestX = x, bestY = y, bestEnergy = currentEnergy;
    let T = initialTemp;

    const path = [[x, y]];
    const energyHistory = [currentEnergy];
    const tempHistory = [T];
    const bestHistory = [bestEnergy];

    let accepted = 0;
    let totalMoves = 0;
    let iteration = 0;

    for (iteration = 1; iteration <= maxIter && T > minTemp; iteration++) {
        // Generate neighbor
        const dx = (Math.random() - 0.5) * 2 * stepSize * (T / initialTemp);
        const dy = (Math.random() - 0.5) * 2 * stepSize * (T / initialTemp);

        let newX = x + dx;
        let newY = y + dy;

        // Boundary handling - reflect
        if (newX < bounds.xMin) newX = bounds.xMin + (bounds.xMin - newX);
        if (newX > bounds.xMax) newX = bounds.xMax - (newX - bounds.xMax);
        if (newY < bounds.yMin) newY = bounds.yMin + (bounds.yMin - newY);
        if (newY > bounds.yMax) newY = bounds.yMax - (newY - bounds.yMax);

        // Clamp to bounds
        newX = Math.max(bounds.xMin, Math.min(bounds.xMax, newX));
        newY = Math.max(bounds.yMin, Math.min(bounds.yMax, newY));

        const newEnergy = func.fn(newX, newY);
        const deltaE = newEnergy - currentEnergy;
        totalMoves++;

        // Acceptance criterion
        if (deltaE < 0 || Math.random() < Math.exp(-deltaE / T)) {
            x = newX;
            y = newY;
            currentEnergy = newEnergy;
            accepted++;

            if (currentEnergy < bestEnergy) {
                bestX = x;
                bestY = y;
                bestEnergy = currentEnergy;
            }
        }

        // Record path (sparse for performance)
        if (iteration % 50 === 0) {
            path.push([x, y]);
            energyHistory.push(currentEnergy);
            bestHistory.push(bestEnergy);
            tempHistory.push(T);
        }

        // Cooling
        T = cool(T, iteration, initialTemp, minTemp, maxIter, coolingRate, coolingSchedule);

        // Progress update
        if (iteration % 500 === 0) {
            self.postMessage({
                type: 'progress',
                iteration,
                maxIter,
                percent: Math.round((iteration / maxIter) * 100),
                currentEnergy,
                bestEnergy,
                temperature: T,
                acceptRate: (accepted / totalMoves * 100).toFixed(1)
            });
        }
    }

    // Final path point
    path.push([bestX, bestY]);
    energyHistory.push(bestEnergy);
    tempHistory.push(T);
    bestHistory.push(bestEnergy);

    self.postMessage({
        type: 'result',
        path,
        energyHistory,
        tempHistory,
        bestHistory,
        bestPosition: [bestX, bestY],
        bestValue: bestEnergy,
        iterations: iteration,
        acceptanceRate: (accepted / totalMoves * 100).toFixed(2),
        finalTemp: T,
        bounds: func.bounds,
        optimum: func.optimum,
        optimalValue: func.optimalValue,
        executionTime: performance.now() - startTime
    });
}

function cool(T, k, T0, Tmin, kMax, alpha, schedule) {
    switch (schedule) {
        case 'exponential':
            return T * alpha;
        case 'linear':
            return T0 - k * (T0 - Tmin) / kMax;
        case 'logarithmic':
            return T0 / (1 + Math.log(1 + k));
        default:
            return T * alpha;
    }
}
