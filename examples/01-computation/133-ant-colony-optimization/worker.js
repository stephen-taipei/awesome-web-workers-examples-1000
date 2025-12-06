// Ant Colony Optimization Web Worker - TSP

self.onmessage = function(e) {
    const { params, cities } = e.data;
    runACO(params, cities);
};

function runACO(params, cities) {
    const { numAnts, maxIterations, alpha, beta, evaporationRate, Q, elitist } = params;
    const n = cities.length;
    const startTime = performance.now();

    // Calculate distance matrix
    const distances = [];
    for (let i = 0; i < n; i++) {
        distances[i] = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                distances[i][j] = 0;
            } else {
                const dx = cities[i].x - cities[j].x;
                const dy = cities[i].y - cities[j].y;
                distances[i][j] = Math.sqrt(dx * dx + dy * dy);
            }
        }
    }

    // Initialize pheromone matrix
    const tau0 = 1 / (n * averageDistance(distances, n));
    const pheromone = [];
    for (let i = 0; i < n; i++) {
        pheromone[i] = [];
        for (let j = 0; j < n; j++) {
            pheromone[i][j] = tau0;
        }
    }

    // Heuristic information (inverse distance)
    const eta = [];
    for (let i = 0; i < n; i++) {
        eta[i] = [];
        for (let j = 0; j < n; j++) {
            eta[i][j] = i === j ? 0 : 1 / distances[i][j];
        }
    }

    let bestTour = null;
    let bestLength = Infinity;
    let initialBestLength = Infinity;

    const lengthHistory = [];
    const pheromoneHistory = [];
    let stagnationCount = 0;
    let lastBestLength = Infinity;

    for (let iter = 1; iter <= maxIterations; iter++) {
        const antTours = [];
        const antLengths = [];

        // Each ant constructs a tour
        for (let ant = 0; ant < numAnts; ant++) {
            const tour = constructTour(n, pheromone, eta, alpha, beta);
            const length = tourLength(tour, distances);
            antTours.push(tour);
            antLengths.push(length);

            if (length < bestLength) {
                bestLength = length;
                bestTour = [...tour];
                if (initialBestLength === Infinity) {
                    initialBestLength = length;
                }
            }
        }

        // Pheromone evaporation
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                pheromone[i][j] *= (1 - evaporationRate);
                // Keep minimum pheromone level
                if (pheromone[i][j] < tau0 * 0.01) {
                    pheromone[i][j] = tau0 * 0.01;
                }
            }
        }

        // Pheromone deposit
        for (let ant = 0; ant < numAnts; ant++) {
            const delta = Q / antLengths[ant];
            const tour = antTours[ant];
            for (let i = 0; i < n; i++) {
                const from = tour[i];
                const to = tour[(i + 1) % n];
                pheromone[from][to] += delta;
                pheromone[to][from] += delta;
            }
        }

        // Elitist ant - extra pheromone on best tour
        if (elitist > 0 && bestTour) {
            const eliteDelta = elitist * Q / bestLength;
            for (let i = 0; i < n; i++) {
                const from = bestTour[i];
                const to = bestTour[(i + 1) % n];
                pheromone[from][to] += eliteDelta;
                pheromone[to][from] += eliteDelta;
            }
        }

        // Record history
        lengthHistory.push({ best: bestLength, avg: average(antLengths) });
        pheromoneHistory.push(avgPheromone(pheromone, n));

        // Stagnation detection
        if (Math.abs(bestLength - lastBestLength) < 1e-10) {
            stagnationCount++;
        } else {
            stagnationCount = 0;
        }
        lastBestLength = bestLength;

        // Progress update
        if (iter % 5 === 0) {
            self.postMessage({
                type: 'progress',
                iteration: iter,
                maxIterations,
                percent: Math.round((iter / maxIterations) * 100),
                bestLength: bestLength.toFixed(2),
                avgLength: average(antLengths).toFixed(2),
                avgPheromone: avgPheromone(pheromone, n).toExponential(2)
            });
        }

        // Early termination on long stagnation
        if (stagnationCount > 30) {
            break;
        }
    }

    const improvement = initialBestLength > 0 ?
        ((initialBestLength - bestLength) / initialBestLength * 100).toFixed(2) : 0;

    self.postMessage({
        type: 'result',
        bestTour,
        bestLength,
        lengthHistory,
        pheromoneHistory,
        improvement,
        stagnation: stagnationCount,
        iterations: lengthHistory.length,
        cities,
        executionTime: performance.now() - startTime
    });
}

function constructTour(n, pheromone, eta, alpha, beta) {
    const tour = [];
    const visited = new Set();

    // Start from random city
    const start = Math.floor(Math.random() * n);
    tour.push(start);
    visited.add(start);

    while (tour.length < n) {
        const current = tour[tour.length - 1];
        const probabilities = [];
        let total = 0;

        // Calculate probabilities for unvisited cities
        for (let j = 0; j < n; j++) {
            if (!visited.has(j)) {
                const prob = Math.pow(pheromone[current][j], alpha) * Math.pow(eta[current][j], beta);
                probabilities.push({ city: j, prob });
                total += prob;
            }
        }

        // Roulette wheel selection
        const r = Math.random() * total;
        let cumSum = 0;
        let nextCity = probabilities[0].city;

        for (const p of probabilities) {
            cumSum += p.prob;
            if (cumSum >= r) {
                nextCity = p.city;
                break;
            }
        }

        tour.push(nextCity);
        visited.add(nextCity);
    }

    return tour;
}

function tourLength(tour, distances) {
    let length = 0;
    const n = tour.length;
    for (let i = 0; i < n; i++) {
        length += distances[tour[i]][tour[(i + 1) % n]];
    }
    return length;
}

function averageDistance(distances, n) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            sum += distances[i][j];
            count++;
        }
    }
    return sum / count;
}

function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function avgPheromone(pheromone, n) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            sum += pheromone[i][j];
            count++;
        }
    }
    return sum / count;
}
