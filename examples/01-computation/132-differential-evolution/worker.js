// Differential Evolution Web Worker

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
    griewank: {
        fn: (x, y) => 1 + (x * x + y * y) / 4000 - Math.cos(x) * Math.cos(y / Math.sqrt(2)),
        bounds: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
        optimum: [0, 0],
        optimalValue: 0
    }
};

self.onmessage = function(e) {
    const { params } = e.data;
    runDE(params);
};

function runDE(params) {
    const { functionName, populationSize, maxGenerations, mutationFactor, crossoverProb, strategy, dither } = params;
    const func = functions[functionName];
    if (!func) { self.postMessage({ type: 'error', message: 'Unknown function' }); return; }

    const { bounds } = func;
    const startTime = performance.now();
    const NP = populationSize;
    const D = 2; // dimensions

    // Initialize population
    let population = [];
    for (let i = 0; i < NP; i++) {
        const ind = {
            x: bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin),
            y: bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin)
        };
        ind.fitness = func.fn(ind.x, ind.y);
        population.push(ind);
    }

    // Find best
    let best = population.reduce((a, b) => a.fitness < b.fitness ? a : b);
    let bestX = best.x, bestY = best.y, bestFitness = best.fitness;

    const fitnessHistory = [{ best: bestFitness, avg: avgFitness(population) }];
    const diversityHistory = [calcDiversity(population)];
    const populationSnapshots = [population.map(ind => [ind.x, ind.y])];

    let totalTrials = 0;
    let successfulTrials = 0;

    for (let gen = 1; gen <= maxGenerations; gen++) {
        // Dither F per generation
        let F = mutationFactor;
        if (dither === 'per-generation') {
            F = 0.5 + 0.5 * Math.random();
        }

        const newPopulation = [];

        for (let i = 0; i < NP; i++) {
            const target = population[i];
            totalTrials++;

            // Dither F per vector
            if (dither === 'per-vector') {
                F = 0.5 + 0.5 * Math.random();
            }

            // Select random distinct indices
            const indices = selectIndices(NP, i, strategy);

            // Mutation based on strategy
            let mutant = mutate(population, indices, best, target, F, strategy);

            // Boundary handling
            mutant.x = clamp(mutant.x, bounds.xMin, bounds.xMax);
            mutant.y = clamp(mutant.y, bounds.yMin, bounds.yMax);

            // Crossover (binomial)
            const trial = { x: target.x, y: target.y };
            const jRand = Math.floor(Math.random() * D);

            if (Math.random() < crossoverProb || jRand === 0) {
                trial.x = mutant.x;
            }
            if (Math.random() < crossoverProb || jRand === 1) {
                trial.y = mutant.y;
            }

            // Evaluate trial
            trial.fitness = func.fn(trial.x, trial.y);

            // Selection
            if (trial.fitness <= target.fitness) {
                newPopulation.push(trial);
                successfulTrials++;

                // Update best
                if (trial.fitness < bestFitness) {
                    bestX = trial.x;
                    bestY = trial.y;
                    bestFitness = trial.fitness;
                }
            } else {
                newPopulation.push({ ...target });
            }
        }

        population = newPopulation;
        best = population.reduce((a, b) => a.fitness < b.fitness ? a : b);

        // Record history
        fitnessHistory.push({ best: bestFitness, avg: avgFitness(population) });
        diversityHistory.push(calcDiversity(population));

        // Record snapshot
        if (gen % 10 === 0 || gen === maxGenerations) {
            populationSnapshots.push(population.map(ind => [ind.x, ind.y]));
        }

        // Progress update
        if (gen % 10 === 0) {
            self.postMessage({
                type: 'progress',
                generation: gen,
                maxGenerations,
                percent: Math.round((gen / maxGenerations) * 100),
                bestFitness,
                avgFitness: avgFitness(population),
                successRate: (successfulTrials / totalTrials * 100).toFixed(1)
            });
        }

        // Early convergence
        if (diversityHistory[diversityHistory.length - 1] < 1e-10) {
            break;
        }
    }

    self.postMessage({
        type: 'result',
        populationSnapshots,
        fitnessHistory,
        diversityHistory,
        bestPosition: [bestX, bestY],
        bestFitness,
        generations: fitnessHistory.length - 1,
        successRate: (successfulTrials / totalTrials * 100).toFixed(2),
        finalDiversity: calcDiversity(population),
        finalPopulation: population.map(ind => [ind.x, ind.y]),
        bounds: func.bounds,
        optimum: func.optimum,
        optimalValue: func.optimalValue,
        executionTime: performance.now() - startTime
    });
}

function selectIndices(NP, exclude, strategy) {
    const indices = [];
    const needed = strategy.includes('2') ? 5 : 3;

    while (indices.length < needed) {
        const r = Math.floor(Math.random() * NP);
        if (r !== exclude && !indices.includes(r)) {
            indices.push(r);
        }
    }
    return indices;
}

function mutate(pop, idx, best, target, F, strategy) {
    switch (strategy) {
        case 'rand1':
            return {
                x: pop[idx[0]].x + F * (pop[idx[1]].x - pop[idx[2]].x),
                y: pop[idx[0]].y + F * (pop[idx[1]].y - pop[idx[2]].y)
            };
        case 'best1':
            return {
                x: best.x + F * (pop[idx[0]].x - pop[idx[1]].x),
                y: best.y + F * (pop[idx[0]].y - pop[idx[1]].y)
            };
        case 'rand2':
            return {
                x: pop[idx[0]].x + F * (pop[idx[1]].x - pop[idx[2]].x) + F * (pop[idx[3]].x - pop[idx[4]].x),
                y: pop[idx[0]].y + F * (pop[idx[1]].y - pop[idx[2]].y) + F * (pop[idx[3]].y - pop[idx[4]].y)
            };
        case 'best2':
            return {
                x: best.x + F * (pop[idx[0]].x - pop[idx[1]].x) + F * (pop[idx[2]].x - pop[idx[3]].x),
                y: best.y + F * (pop[idx[0]].y - pop[idx[1]].y) + F * (pop[idx[2]].y - pop[idx[3]].y)
            };
        case 'currentToBest1':
            return {
                x: target.x + F * (best.x - target.x) + F * (pop[idx[0]].x - pop[idx[1]].x),
                y: target.y + F * (best.y - target.y) + F * (pop[idx[0]].y - pop[idx[1]].y)
            };
        default:
            return {
                x: pop[idx[0]].x + F * (pop[idx[1]].x - pop[idx[2]].x),
                y: pop[idx[0]].y + F * (pop[idx[1]].y - pop[idx[2]].y)
            };
    }
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function avgFitness(pop) {
    return pop.reduce((sum, ind) => sum + ind.fitness, 0) / pop.length;
}

function calcDiversity(pop) {
    const cx = pop.reduce((sum, ind) => sum + ind.x, 0) / pop.length;
    const cy = pop.reduce((sum, ind) => sum + ind.y, 0) / pop.length;
    return Math.sqrt(pop.reduce((sum, ind) => sum + Math.pow(ind.x - cx, 2) + Math.pow(ind.y - cy, 2), 0) / pop.length);
}
