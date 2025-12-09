// NSGA-II Implementation for ZDT problems
// ZDT1, ZDT2, ZDT3 are standard multi-objective test problems with 2 objectives.
// Variable domain: [0, 1] for all x_i. usually 30 variables.

self.onmessage = function(e) {
    const { type, data } = e.data;
    if (type === 'start') {
        runNSGAII(data);
    }
};

function runNSGAII(params) {
    const { problem, popSize, generations, mutationRate, crossoverRate } = params;
    const numVars = 30; // Standard for ZDT problems

    // Initialize Population
    let population = [];
    for (let i = 0; i < popSize; i++) {
        population.push(createIndividual(numVars));
    }

    evaluatePopulation(population, problem);

    // Initial Rank and Crowding Distance
    fastNonDominatedSort(population);
    // Crowding distance is needed for selection, but first gen we just start.

    const reportInterval = Math.max(1, Math.floor(generations / 100));

    for (let gen = 0; gen < generations; gen++) {
        // Create Offspring (Selection + Crossover + Mutation)
        // Tournament Selection based on Rank and Crowding Distance
        assignCrowdingDistance(population); // Ensure crowding distance is set

        let offspring = [];
        while (offspring.length < popSize) {
            let p1 = tournamentSelect(population);
            let p2 = tournamentSelect(population);

            let children = crossover(p1, p2, crossoverRate);
            mutate(children[0], mutationRate);
            mutate(children[1], mutationRate);

            offspring.push(children[0]);
            if (offspring.length < popSize) offspring.push(children[1]);
        }

        evaluatePopulation(offspring, problem);

        // Combine Parent + Offspring
        let combined = population.concat(offspring);

        // Non-dominated Sorting on Combined Population
        let fronts = fastNonDominatedSort(combined);

        // Select best N individuals for next generation
        let nextGen = [];
        let frontIdx = 0;
        while (nextGen.length + fronts[frontIdx].length <= popSize) {
            assignCrowdingDistance(fronts[frontIdx]);
            nextGen = nextGen.concat(fronts[frontIdx]);
            frontIdx++;
            if (frontIdx >= fronts.length) break;
        }

        // Fill remaining slots from the current front sorted by Crowding Distance
        if (nextGen.length < popSize && frontIdx < fronts.length) {
            let lastFront = fronts[frontIdx];
            assignCrowdingDistance(lastFront);
            // Sort descending by crowding distance
            lastFront.sort((a, b) => b.distance - a.distance);

            let needed = popSize - nextGen.length;
            for (let i = 0; i < needed; i++) {
                nextGen.push(lastFront[i]);
            }
        }

        population = nextGen;

        if (gen % reportInterval === 0 || gen === generations - 1) {
            // Extract objectives for visualization
            // Only send rank 0 (Pareto Front approximation)
            let paretoFront = population.filter(ind => ind.rank === 0).map(ind => ind.objectives);
            self.postMessage({
                type: 'progress',
                generation: gen,
                paretoFront: paretoFront
            });
        }
    }

    self.postMessage({
        type: 'done',
        paretoFront: population.filter(ind => ind.rank === 0).map(ind => ind.objectives)
    });
}

// --- Individual & Evaluation ---

function createIndividual(numVars) {
    let genes = new Float32Array(numVars);
    for (let i = 0; i < numVars; i++) genes[i] = Math.random();
    return { genes, objectives: [], rank: 0, distance: 0, dominationCount: 0, dominatedInds: [] };
}

function evaluatePopulation(pop, problemName) {
    for (let ind of pop) {
        ind.objectives = evaluate(ind.genes, problemName);
    }
}

function evaluate(genes, problemName) {
    const n = genes.length;
    const f1 = genes[0];
    let g = 0;
    for (let i = 1; i < n; i++) {
        g += genes[i];
    }
    g = 1 + 9 * g / (n - 1);

    let h = 0;
    if (problemName === 'ZDT1') {
        h = 1 - Math.sqrt(f1 / g);
    } else if (problemName === 'ZDT2') {
        h = 1 - Math.pow(f1 / g, 2);
    } else if (problemName === 'ZDT3') {
        h = 1 - Math.sqrt(f1 / g) - (f1 / g) * Math.sin(10 * Math.PI * f1);
    }

    const f2 = g * h;
    return [f1, f2];
}

// --- NSGA-II Core ---

function fastNonDominatedSort(pop) {
    let fronts = [[]];

    for (let p of pop) {
        p.dominatedInds = [];
        p.dominationCount = 0;

        for (let q of pop) {
            if (dominates(p, q)) {
                p.dominatedInds.push(q);
            } else if (dominates(q, p)) {
                p.dominationCount++;
            }
        }

        if (p.dominationCount === 0) {
            p.rank = 0;
            fronts[0].push(p);
        }
    }

    let i = 0;
    while (fronts[i].length > 0) {
        let nextFront = [];
        for (let p of fronts[i]) {
            for (let q of p.dominatedInds) {
                q.dominationCount--;
                if (q.dominationCount === 0) {
                    q.rank = i + 1;
                    nextFront.push(q);
                }
            }
        }
        i++;
        if (nextFront.length > 0) fronts.push(nextFront);
    }

    return fronts;
}

function dominates(p, q) {
    // p dominates q if p is better or equal in all objectives, and strictly better in at least one
    // Here we MINIMIZE both objectives
    let betterInOne = false;
    for (let i = 0; i < p.objectives.length; i++) {
        if (p.objectives[i] > q.objectives[i]) return false; // p is worse
        if (p.objectives[i] < q.objectives[i]) betterInOne = true;
    }
    return betterInOne;
}

function assignCrowdingDistance(front) {
    if (front.length === 0) return;

    for (let ind of front) ind.distance = 0;

    const numObjs = front[0].objectives.length;

    for (let m = 0; m < numObjs; m++) {
        // Sort by objective m
        front.sort((a, b) => a.objectives[m] - b.objectives[m]);

        front[0].distance = Infinity;
        front[front.length - 1].distance = Infinity;

        const minObj = front[0].objectives[m];
        const maxObj = front[front.length - 1].objectives[m];
        const range = maxObj - minObj;

        if (range === 0) continue;

        for (let i = 1; i < front.length - 1; i++) {
            front[i].distance += (front[i+1].objectives[m] - front[i-1].objectives[m]) / range;
        }
    }
}

function tournamentSelect(pop) {
    const k = 2; // Binary tournament
    let best = pop[Math.floor(Math.random() * pop.length)];

    for (let i = 1; i < k; i++) {
        let contender = pop[Math.floor(Math.random() * pop.length)];
        if (compare(contender, best) < 0) {
            best = contender;
        }
    }
    return best;
}

function compare(ind1, ind2) {
    if (ind1.rank < ind2.rank) return -1;
    if (ind1.rank > ind2.rank) return 1;
    if (ind1.distance > ind2.distance) return -1; // Larger distance is better
    if (ind1.distance < ind2.distance) return 1;
    return 0;
}

// --- Genetic Operators ---

function crossover(p1, p2, rate) {
    // Simulated Binary Crossover (SBX)
    if (Math.random() > rate) {
        return [clone(p1), clone(p2)];
    }

    const eta = 20;
    const n = p1.genes.length;
    let c1Genes = new Float32Array(n);
    let c2Genes = new Float32Array(n);

    for (let i = 0; i < n; i++) {
        if (Math.random() <= 0.5) {
            if (Math.abs(p1.genes[i] - p2.genes[i]) > 1e-14) {
                let y1 = Math.min(p1.genes[i], p2.genes[i]);
                let y2 = Math.max(p1.genes[i], p2.genes[i]);
                let rand = Math.random();
                let beta = 1.0 + (2.0 * (y1)) / (y2 - y1);
                let alpha = 2.0 - Math.pow(beta, -(eta + 1.0));
                let betaq;

                if (rand <= (1.0 / alpha)) {
                    betaq = Math.pow(rand * alpha, (1.0 / (eta + 1.0)));
                } else {
                    betaq = Math.pow(1.0 / (2.0 - rand * alpha), (1.0 / (eta + 1.0)));
                }

                let c1 = 0.5 * ((y1 + y2) - betaq * (y2 - y1));
                let c2 = 0.5 * ((y1 + y2) + betaq * (y2 - y1));

                c1Genes[i] = Math.max(0, Math.min(1, c1));
                c2Genes[i] = Math.max(0, Math.min(1, c2));
            } else {
                c1Genes[i] = p1.genes[i];
                c2Genes[i] = p2.genes[i];
            }
        } else {
            c1Genes[i] = p1.genes[i];
            c2Genes[i] = p2.genes[i];
        }
    }

    return [{genes: c1Genes, objectives: []}, {genes: c2Genes, objectives: []}];
}

function mutate(ind, rate) {
    // Polynomial Mutation
    const eta = 20;
    const n = ind.genes.length;
    for (let i = 0; i < n; i++) {
        if (Math.random() <= rate) {
            let y = ind.genes[i];
            let delta1 = (y - 0) / (1 - 0);
            let delta2 = (1 - y) / (1 - 0);
            let rand = Math.random();
            let mut_pow = 1.0 / (eta + 1.0);
            let deltaq;
            if (rand <= 0.5) {
                let xy = 1.0 - delta1;
                let val = 2.0 * rand + (1.0 - 2.0 * rand) * (Math.pow(xy, (eta + 1.0)));
                deltaq = Math.pow(val, mut_pow) - 1.0;
            } else {
                let xy = 1.0 - delta2;
                let val = 2.0 * (1.0 - rand) + 2.0 * (rand - 0.5) * (Math.pow(xy, (eta + 1.0)));
                deltaq = 1.0 - Math.pow(val, mut_pow);
            }
            let val = y + deltaq;
            ind.genes[i] = Math.max(0, Math.min(1, val));
        }
    }
}

function clone(ind) {
    return {
        genes: new Float32Array(ind.genes),
        objectives: [...ind.objectives],
        rank: ind.rank,
        distance: ind.distance
    };
}
