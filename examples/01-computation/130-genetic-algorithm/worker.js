// Genetic Algorithm Web Worker

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
    runGA(params);
};

function runGA(params) {
    const { functionName, populationSize, maxGenerations, crossoverRate, mutationRate,
            selectionMethod, tournamentSize, elitism, crossoverType } = params;
    const func = functions[functionName];
    if (!func) { self.postMessage({ type: 'error', message: 'Unknown function' }); return; }

    const { bounds } = func;
    const startTime = performance.now();

    // Initialize population
    let population = [];
    for (let i = 0; i < populationSize; i++) {
        population.push({
            x: bounds.xMin + Math.random() * (bounds.xMax - bounds.xMin),
            y: bounds.yMin + Math.random() * (bounds.yMax - bounds.yMin)
        });
    }

    // Evaluate fitness (minimize, so negate for selection)
    function evaluate(pop) {
        return pop.map(ind => ({
            ...ind,
            fitness: func.fn(ind.x, ind.y)
        }));
    }

    population = evaluate(population);

    let bestIndividual = population.reduce((a, b) => a.fitness < b.fitness ? a : b);
    const fitnessHistory = [{ best: bestIndividual.fitness, avg: avgFitness(population) }];
    const diversityHistory = [calcDiversity(population)];
    const populationSnapshots = [population.map(ind => [ind.x, ind.y])];

    let generation = 0;

    for (generation = 1; generation <= maxGenerations; generation++) {
        // Selection
        const parents = select(population, selectionMethod, tournamentSize);

        // Create new population
        const newPopulation = [];

        // Elitism - keep best individuals
        const sorted = [...population].sort((a, b) => a.fitness - b.fitness);
        for (let i = 0; i < elitism && i < sorted.length; i++) {
            newPopulation.push({ x: sorted[i].x, y: sorted[i].y });
        }

        // Crossover and mutation
        while (newPopulation.length < populationSize) {
            const p1 = parents[Math.floor(Math.random() * parents.length)];
            const p2 = parents[Math.floor(Math.random() * parents.length)];

            let offspring;
            if (Math.random() < crossoverRate) {
                offspring = crossover(p1, p2, crossoverType);
            } else {
                offspring = { x: p1.x, y: p1.y };
            }

            // Mutation
            if (Math.random() < mutationRate) {
                offspring = mutate(offspring, bounds, generation, maxGenerations);
            }

            // Boundary check
            offspring.x = Math.max(bounds.xMin, Math.min(bounds.xMax, offspring.x));
            offspring.y = Math.max(bounds.yMin, Math.min(bounds.yMax, offspring.y));

            newPopulation.push(offspring);
        }

        population = evaluate(newPopulation);

        // Update best
        const genBest = population.reduce((a, b) => a.fitness < b.fitness ? a : b);
        if (genBest.fitness < bestIndividual.fitness) {
            bestIndividual = { ...genBest };
        }

        // Record history
        fitnessHistory.push({ best: bestIndividual.fitness, avg: avgFitness(population) });
        diversityHistory.push(calcDiversity(population));

        // Record population snapshot every 10 generations
        if (generation % 10 === 0 || generation === maxGenerations) {
            populationSnapshots.push(population.map(ind => [ind.x, ind.y]));
        }

        // Progress update
        if (generation % 10 === 0) {
            self.postMessage({
                type: 'progress',
                generation,
                maxGenerations,
                percent: Math.round((generation / maxGenerations) * 100),
                bestFitness: bestIndividual.fitness,
                avgFitness: avgFitness(population),
                diversity: calcDiversity(population).toFixed(4)
            });
        }

        // Early convergence check
        if (diversityHistory[diversityHistory.length - 1] < 1e-6) {
            break;
        }
    }

    self.postMessage({
        type: 'result',
        populationSnapshots,
        fitnessHistory,
        diversityHistory,
        bestPosition: [bestIndividual.x, bestIndividual.y],
        bestFitness: bestIndividual.fitness,
        generations: generation,
        finalDiversity: calcDiversity(population),
        finalPopulation: population.map(ind => [ind.x, ind.y]),
        bounds: func.bounds,
        optimum: func.optimum,
        optimalValue: func.optimalValue,
        executionTime: performance.now() - startTime
    });
}

function avgFitness(pop) {
    return pop.reduce((sum, ind) => sum + ind.fitness, 0) / pop.length;
}

function calcDiversity(pop) {
    const cx = pop.reduce((sum, ind) => sum + ind.x, 0) / pop.length;
    const cy = pop.reduce((sum, ind) => sum + ind.y, 0) / pop.length;
    return Math.sqrt(pop.reduce((sum, ind) => sum + Math.pow(ind.x - cx, 2) + Math.pow(ind.y - cy, 2), 0) / pop.length);
}

function select(population, method, tournamentSize) {
    const n = population.length;
    const selected = [];

    switch (method) {
        case 'tournament':
            for (let i = 0; i < n; i++) {
                let best = population[Math.floor(Math.random() * n)];
                for (let j = 1; j < tournamentSize; j++) {
                    const competitor = population[Math.floor(Math.random() * n)];
                    if (competitor.fitness < best.fitness) best = competitor;
                }
                selected.push(best);
            }
            break;

        case 'roulette':
            // Invert fitness for minimization (higher = better)
            const maxFit = Math.max(...population.map(ind => ind.fitness));
            const inverted = population.map(ind => maxFit - ind.fitness + 1);
            const total = inverted.reduce((a, b) => a + b, 0);
            for (let i = 0; i < n; i++) {
                let r = Math.random() * total;
                let cumSum = 0;
                for (let j = 0; j < n; j++) {
                    cumSum += inverted[j];
                    if (cumSum >= r) { selected.push(population[j]); break; }
                }
            }
            break;

        case 'rank':
            const sorted = [...population].sort((a, b) => a.fitness - b.fitness);
            const rankSum = n * (n + 1) / 2;
            for (let i = 0; i < n; i++) {
                let r = Math.random() * rankSum;
                let cumSum = 0;
                for (let j = 0; j < n; j++) {
                    cumSum += (n - j); // Higher rank = better (lower fitness)
                    if (cumSum >= r) { selected.push(sorted[j]); break; }
                }
            }
            break;
    }

    return selected;
}

function crossover(p1, p2, type) {
    switch (type) {
        case 'blx': // BLX-alpha
            const alpha = 0.5;
            const dx = Math.abs(p2.x - p1.x);
            const dy = Math.abs(p2.y - p1.y);
            return {
                x: Math.min(p1.x, p2.x) - alpha * dx + Math.random() * (dx + 2 * alpha * dx),
                y: Math.min(p1.y, p2.y) - alpha * dy + Math.random() * (dy + 2 * alpha * dy)
            };

        case 'uniform':
            return {
                x: Math.random() < 0.5 ? p1.x : p2.x,
                y: Math.random() < 0.5 ? p1.y : p2.y
            };

        case 'arithmetic':
            const ratio = Math.random();
            return {
                x: ratio * p1.x + (1 - ratio) * p2.x,
                y: ratio * p1.y + (1 - ratio) * p2.y
            };

        default:
            return { x: p1.x, y: p1.y };
    }
}

function mutate(ind, bounds, gen, maxGen) {
    // Decreasing mutation strength over generations
    const strength = (1 - gen / maxGen) * 0.5 + 0.1;
    const rangeX = (bounds.xMax - bounds.xMin) * strength;
    const rangeY = (bounds.yMax - bounds.yMin) * strength;

    return {
        x: ind.x + (Math.random() - 0.5) * 2 * rangeX,
        y: ind.y + (Math.random() - 0.5) * 2 * rangeY
    };
}
