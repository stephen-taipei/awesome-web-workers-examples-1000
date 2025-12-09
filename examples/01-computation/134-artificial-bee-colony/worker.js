// Artificial Bee Colony Web Worker

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
    },
    griewank: {
        fn: (x, y) => 1 + (x * x + y * y) / 4000 - Math.cos(x) * Math.cos(y / Math.sqrt(2)),
        bounds: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
        optimum: [0, 0],
        optimalValue: 0
    }
};

self.onmessage = function(e) {
    const { params } = e.data;
    runABC(params);
};

function runABC(params) {
    const { functionName, colonySize, maxCycles, limit, modificationRate } = params;
    const func = functions[functionName];
    if (!func) { self.postMessage({ type: 'error', message: 'Unknown function' }); return; }

    const { bounds } = func;
    const startTime = performance.now();
    const foodSources = colonySize / 2; // Number of food sources (employed bees)

    // Initialize food sources
    const sources = [];
    for (let i = 0; i < foodSources; i++) {
        const source = {
            x: bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin),
            y: bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin),
            trials: 0
        };
        source.fitness = func.fn(source.x, source.y);
        source.prob = calcFitnessProb(source.fitness);
        sources.push(source);
    }

    // Track best solution
    let best = sources.reduce((a, b) => a.fitness < b.fitness ? a : b);
    let bestX = best.x, bestY = best.y, bestFitness = best.fitness;

    const fitnessHistory = [{ best: bestFitness, avg: avgFitness(sources) }];
    const diversityHistory = [calcDiversity(sources)];
    let scoutEvents = 0;

    for (let cycle = 1; cycle <= maxCycles; cycle++) {
        // Employed Bee Phase
        for (let i = 0; i < foodSources; i++) {
            const newSource = employedBeePhase(sources, i, func, bounds, modificationRate);
            if (newSource.fitness < sources[i].fitness) {
                sources[i] = newSource;
                sources[i].trials = 0;
            } else {
                sources[i].trials++;
            }
        }

        // Calculate selection probabilities
        const totalProb = sources.reduce((sum, s) => sum + calcFitnessProb(s.fitness), 0);
        for (const source of sources) {
            source.prob = calcFitnessProb(source.fitness) / totalProb;
        }

        // Onlooker Bee Phase
        for (let i = 0; i < foodSources; i++) {
            // Select source based on probability (roulette wheel)
            const selectedIdx = rouletteSelect(sources);
            const newSource = employedBeePhase(sources, selectedIdx, func, bounds, modificationRate);

            if (newSource.fitness < sources[selectedIdx].fitness) {
                sources[selectedIdx] = newSource;
                sources[selectedIdx].trials = 0;
            } else {
                sources[selectedIdx].trials++;
            }
        }

        // Scout Bee Phase
        for (let i = 0; i < foodSources; i++) {
            if (sources[i].trials > limit) {
                // Abandon source and create new random one
                sources[i] = {
                    x: bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin),
                    y: bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin),
                    trials: 0
                };
                sources[i].fitness = func.fn(sources[i].x, sources[i].y);
                scoutEvents++;
            }
        }

        // Update best solution
        for (const source of sources) {
            if (source.fitness < bestFitness) {
                bestX = source.x;
                bestY = source.y;
                bestFitness = source.fitness;
            }
        }

        // Record history
        fitnessHistory.push({ best: bestFitness, avg: avgFitness(sources) });
        diversityHistory.push(calcDiversity(sources));

        // Progress update
        if (cycle % 10 === 0) {
            self.postMessage({
                type: 'progress',
                cycle,
                maxCycles,
                percent: Math.round((cycle / maxCycles) * 100),
                bestFitness,
                avgFitness: avgFitness(sources),
                scoutEvents
            });
        }

        // Early convergence check
        if (diversityHistory[diversityHistory.length - 1] < 1e-10) {
            break;
        }
    }

    self.postMessage({
        type: 'result',
        sources: sources.map(s => ({ x: s.x, y: s.y, fitness: s.fitness })),
        fitnessHistory,
        diversityHistory,
        bestPosition: [bestX, bestY],
        bestFitness,
        cycles: fitnessHistory.length - 1,
        scoutEvents,
        bounds: func.bounds,
        optimum: func.optimum,
        optimalValue: func.optimalValue,
        executionTime: performance.now() - startTime
    });
}

function employedBeePhase(sources, idx, func, bounds, modificationRate) {
    const source = sources[idx];
    const D = 2; // dimensions

    // Select random neighbor (different from current)
    let k = idx;
    while (k === idx) {
        k = Math.floor(Math.random() * sources.length);
    }

    // Create new candidate solution
    const newSource = { x: source.x, y: source.y, trials: 0 };

    // Modify dimensions based on modification rate
    if (Math.random() < modificationRate) {
        const phi = (Math.random() - 0.5) * 2; // [-1, 1]
        newSource.x = source.x + phi * (source.x - sources[k].x);
    }
    if (Math.random() < modificationRate) {
        const phi = (Math.random() - 0.5) * 2;
        newSource.y = source.y + phi * (source.y - sources[k].y);
    }

    // Ensure at least one dimension is modified
    if (newSource.x === source.x && newSource.y === source.y) {
        const j = Math.random() < 0.5 ? 'x' : 'y';
        const phi = (Math.random() - 0.5) * 2;
        if (j === 'x') {
            newSource.x = source.x + phi * (source.x - sources[k].x);
        } else {
            newSource.y = source.y + phi * (source.y - sources[k].y);
        }
    }

    // Boundary handling
    newSource.x = Math.max(bounds.xMin, Math.min(bounds.xMax, newSource.x));
    newSource.y = Math.max(bounds.yMin, Math.min(bounds.yMax, newSource.y));

    newSource.fitness = func.fn(newSource.x, newSource.y);
    return newSource;
}

function calcFitnessProb(fitness) {
    // Convert minimization fitness to probability (higher is better)
    return 1 / (1 + fitness);
}

function rouletteSelect(sources) {
    const r = Math.random();
    let cumSum = 0;
    for (let i = 0; i < sources.length; i++) {
        cumSum += sources[i].prob;
        if (cumSum >= r) return i;
    }
    return sources.length - 1;
}

function avgFitness(sources) {
    return sources.reduce((sum, s) => sum + s.fitness, 0) / sources.length;
}

function calcDiversity(sources) {
    const cx = sources.reduce((sum, s) => sum + s.x, 0) / sources.length;
    const cy = sources.reduce((sum, s) => sum + s.y, 0) / sources.length;
    return Math.sqrt(sources.reduce((sum, s) => sum + Math.pow(s.x - cx, 2) + Math.pow(s.y - cy, 2), 0) / sources.length);
}
