// Particle Swarm Optimization Web Worker

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
    sphere: {
        fn: (x, y) => x * x + y * y,
        bounds: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
        optimum: [0, 0],
        optimalValue: 0
    }
};

self.onmessage = function(e) {
    const { params } = e.data;
    runPSO(params);
};

function runPSO(params) {
    const { functionName, swarmSize, maxIterations, inertiaWeight, cognitiveCoeff, socialCoeff, velocityClamp, variant } = params;
    const func = functions[functionName];
    if (!func) { self.postMessage({ type: 'error', message: 'Unknown function' }); return; }

    const { bounds } = func;
    const startTime = performance.now();

    const rangeX = bounds.xMax - bounds.xMin;
    const rangeY = bounds.yMax - bounds.yMin;
    const vMaxX = rangeX * velocityClamp;
    const vMaxY = rangeY * velocityClamp;

    // Initialize swarm
    const particles = [];
    for (let i = 0; i < swarmSize; i++) {
        const x = bounds.xMin + Math.random() * rangeX;
        const y = bounds.yMin + Math.random() * rangeY;
        const fitness = func.fn(x, y);
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * vMaxX,
            vy: (Math.random() - 0.5) * vMaxY,
            fitness,
            pBestX: x,
            pBestY: y,
            pBestFitness: fitness
        });
    }

    // Global best
    let gBest = particles.reduce((a, b) => a.pBestFitness < b.pBestFitness ? a : b);
    let gBestX = gBest.pBestX;
    let gBestY = gBest.pBestY;
    let gBestFitness = gBest.pBestFitness;

    const fitnessHistory = [gBestFitness];
    const spreadHistory = [calcSpread(particles)];
    const swarmSnapshots = [particles.map(p => [p.x, p.y])];

    let w = inertiaWeight;
    const wMin = 0.4, wMax = inertiaWeight;

    // Constriction factor
    const phi = cognitiveCoeff + socialCoeff;
    const chi = phi > 4 ? 2 / Math.abs(2 - phi - Math.sqrt(phi * phi - 4 * phi)) : 1;

    for (let iter = 1; iter <= maxIterations; iter++) {
        // Update inertia weight for LDW variant
        if (variant === 'ldw') {
            w = wMax - (wMax - wMin) * iter / maxIterations;
        }

        for (const p of particles) {
            const r1 = Math.random();
            const r2 = Math.random();

            // Velocity update
            let newVx = w * p.vx +
                        cognitiveCoeff * r1 * (p.pBestX - p.x) +
                        socialCoeff * r2 * (gBestX - p.x);
            let newVy = w * p.vy +
                        cognitiveCoeff * r1 * (p.pBestY - p.y) +
                        socialCoeff * r2 * (gBestY - p.y);

            // Apply constriction factor
            if (variant === 'constriction') {
                newVx *= chi;
                newVy *= chi;
            }

            // Velocity clamping
            newVx = Math.max(-vMaxX, Math.min(vMaxX, newVx));
            newVy = Math.max(-vMaxY, Math.min(vMaxY, newVy));

            p.vx = newVx;
            p.vy = newVy;

            // Position update
            p.x += p.vx;
            p.y += p.vy;

            // Boundary handling - reflect
            if (p.x < bounds.xMin) { p.x = bounds.xMin; p.vx *= -0.5; }
            if (p.x > bounds.xMax) { p.x = bounds.xMax; p.vx *= -0.5; }
            if (p.y < bounds.yMin) { p.y = bounds.yMin; p.vy *= -0.5; }
            if (p.y > bounds.yMax) { p.y = bounds.yMax; p.vy *= -0.5; }

            // Evaluate fitness
            p.fitness = func.fn(p.x, p.y);

            // Update personal best
            if (p.fitness < p.pBestFitness) {
                p.pBestX = p.x;
                p.pBestY = p.y;
                p.pBestFitness = p.fitness;

                // Update global best
                if (p.pBestFitness < gBestFitness) {
                    gBestX = p.pBestX;
                    gBestY = p.pBestY;
                    gBestFitness = p.pBestFitness;
                }
            }
        }

        // Record history
        fitnessHistory.push(gBestFitness);
        spreadHistory.push(calcSpread(particles));

        // Record swarm snapshot
        if (iter % 10 === 0 || iter === maxIterations) {
            swarmSnapshots.push(particles.map(p => [p.x, p.y]));
        }

        // Progress update
        if (iter % 10 === 0) {
            self.postMessage({
                type: 'progress',
                iteration: iter,
                maxIterations,
                percent: Math.round((iter / maxIterations) * 100),
                bestFitness: gBestFitness,
                spread: calcSpread(particles).toFixed(4)
            });
        }

        // Early convergence check
        if (spreadHistory[spreadHistory.length - 1] < 1e-8) {
            break;
        }
    }

    self.postMessage({
        type: 'result',
        swarmSnapshots,
        fitnessHistory,
        spreadHistory,
        bestPosition: [gBestX, gBestY],
        bestFitness: gBestFitness,
        iterations: fitnessHistory.length - 1,
        finalSpread: calcSpread(particles),
        finalSwarm: particles.map(p => ({ x: p.x, y: p.y, fitness: p.fitness })),
        bounds: func.bounds,
        optimum: func.optimum,
        optimalValue: func.optimalValue,
        executionTime: performance.now() - startTime
    });
}

function calcSpread(particles) {
    const cx = particles.reduce((sum, p) => sum + p.x, 0) / particles.length;
    const cy = particles.reduce((sum, p) => sum + p.y, 0) / particles.length;
    return Math.sqrt(particles.reduce((sum, p) => sum + Math.pow(p.x - cx, 2) + Math.pow(p.y - cy, 2), 0) / particles.length);
}
