// Speculative Execution - Web Worker

self.onmessage = function(e) {
    const { scenario, partition, targetValue, workerId, dataSize, isPredicted, hasTarget, sequential } = e.data;

    switch (scenario) {
        case 'search':
            parallelSearch(partition, targetValue, workerId, hasTarget, sequential);
            break;
        case 'database':
            databaseQuery(partition, targetValue, workerId, hasTarget, sequential);
            break;
        case 'pathfinding':
            pathFinding(partition, targetValue, workerId, hasTarget, sequential);
            break;
        case 'prediction':
            branchPrediction(partition, targetValue, workerId, hasTarget, sequential);
            break;
        default:
            parallelSearch(partition, targetValue, workerId, hasTarget, sequential);
    }
};

function parallelSearch(partition, targetValue, workerId, hasTarget, sequential) {
    const { start, end } = partition;
    const size = end - start;

    // Generate data for this partition
    const data = [];
    for (let i = 0; i < size; i++) {
        data.push(Math.floor(Math.random() * 1000) + 1);
    }

    // If this worker has the target, insert it at random position
    let targetPosition = -1;
    if (hasTarget) {
        targetPosition = Math.floor(Math.random() * size * 0.8) + Math.floor(size * 0.1);
        data[targetPosition] = targetValue;
    }

    let found = false;
    let foundAt = -1;
    const reportInterval = Math.max(1, Math.floor(size / 50));

    for (let i = 0; i < size; i++) {
        // Simulate search work
        let hash = data[i];
        for (let j = 0; j < 100; j++) {
            hash = (hash * 31 + j) % 1000000;
        }

        if (data[i] === targetValue) {
            found = true;
            foundAt = start + i;
            break;
        }

        if (i % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                percent: (i / size) * 100,
                processed: i
            });
        }
    }

    self.postMessage({
        type: 'result',
        found,
        value: found ? targetValue : null,
        position: foundAt,
        workerId,
        itemsSearched: found ? (foundAt - start + 1) : size
    });
}

function databaseQuery(partition, targetValue, workerId, hasTarget, sequential) {
    const { start, end } = partition;
    const size = end - start;

    // Simulate different query strategies
    const strategies = ['index_scan', 'full_scan', 'hash_lookup', 'btree_search'];
    const strategy = strategies[workerId % strategies.length];

    let baseLatency;
    switch (strategy) {
        case 'index_scan':
            baseLatency = 50;
            break;
        case 'hash_lookup':
            baseLatency = 30;
            break;
        case 'btree_search':
            baseLatency = 40;
            break;
        default:
            baseLatency = 100;
    }

    // Simulate query execution
    const reportInterval = Math.max(1, Math.floor(size / 30));
    let processed = 0;

    for (let i = 0; i < size; i++) {
        // Simulate database work with varying complexity
        let work = 0;
        const complexity = sequential ? 200 : baseLatency + Math.random() * 50;
        for (let j = 0; j < complexity; j++) {
            work += Math.sin(i * j) * Math.cos(j);
        }

        processed = i + 1;

        if (i % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                percent: (i / size) * 100,
                processed
            });
        }

        // Early termination if target found
        if (hasTarget && i >= size * 0.3 + Math.random() * size * 0.4) {
            break;
        }
    }

    self.postMessage({
        type: 'result',
        found: hasTarget,
        value: hasTarget ? `Query result: ${targetValue}` : null,
        strategy,
        workerId,
        rowsScanned: processed
    });
}

function pathFinding(partition, targetValue, workerId, hasTarget, sequential) {
    const { start, end } = partition;
    const gridSize = Math.floor(Math.sqrt(end - start));

    // Different pathfinding algorithms
    const algorithms = ['astar', 'dijkstra', 'bfs', 'greedy'];
    const algorithm = algorithms[workerId % algorithms.length];

    // Create a simple grid
    const grid = [];
    for (let i = 0; i < gridSize; i++) {
        grid[i] = [];
        for (let j = 0; j < gridSize; j++) {
            grid[i][j] = Math.random() > 0.2 ? 0 : 1; // 0 = passable, 1 = obstacle
        }
    }

    const startPos = { x: 0, y: 0 };
    const endPos = { x: gridSize - 1, y: gridSize - 1 };
    grid[startPos.x][startPos.y] = 0;
    grid[endPos.x][endPos.y] = 0;

    // Simplified pathfinding simulation
    const visited = new Set();
    const queue = [startPos];
    let found = false;
    let pathLength = 0;
    let nodesExplored = 0;

    const reportInterval = Math.max(1, Math.floor(gridSize * gridSize / 30));

    while (queue.length > 0 && nodesExplored < gridSize * gridSize) {
        const current = queue.shift();
        const key = `${current.x},${current.y}`;

        if (visited.has(key)) continue;
        visited.add(key);
        nodesExplored++;

        // Simulate algorithm-specific work
        let work = 0;
        const complexity = algorithm === 'astar' ? 50 :
                          algorithm === 'dijkstra' ? 80 :
                          algorithm === 'greedy' ? 30 : 60;
        for (let i = 0; i < complexity; i++) {
            work += Math.sqrt(current.x * current.x + current.y * current.y);
        }

        if (current.x === endPos.x && current.y === endPos.y) {
            found = true;
            pathLength = visited.size;
            break;
        }

        // Add neighbors
        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 }
        ];

        for (const n of neighbors) {
            if (n.x >= 0 && n.x < gridSize && n.y >= 0 && n.y < gridSize &&
                grid[n.x][n.y] === 0 && !visited.has(`${n.x},${n.y}`)) {
                queue.push(n);
            }
        }

        if (nodesExplored % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                percent: (nodesExplored / (gridSize * gridSize)) * 100,
                processed: nodesExplored
            });
        }
    }

    self.postMessage({
        type: 'result',
        found: found && hasTarget,
        value: found ? `Path length: ${pathLength}` : null,
        algorithm,
        workerId,
        nodesExplored
    });
}

function branchPrediction(partition, targetValue, workerId, hasTarget, sequential) {
    const { start, end } = partition;
    const iterations = end - start;

    // Simulate different branch execution paths
    const branches = ['branch_A', 'branch_B', 'branch_C', 'branch_D'];
    const branch = branches[workerId % branches.length];

    let result = 0;
    const reportInterval = Math.max(1, Math.floor(iterations / 40));

    for (let i = 0; i < iterations; i++) {
        // Simulate branch-specific computation
        switch (branch) {
            case 'branch_A':
                result += Math.sin(i) * Math.cos(i);
                break;
            case 'branch_B':
                result += Math.log(i + 1) * Math.sqrt(i + 1);
                break;
            case 'branch_C':
                result += Math.pow(i % 100, 2) / 1000;
                break;
            case 'branch_D':
                result += Math.tan(i % 100) * 0.01;
                break;
        }

        // Additional work simulation
        for (let j = 0; j < 50; j++) {
            result += Math.random() * 0.0001;
        }

        if (i % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                percent: (i / iterations) * 100,
                processed: i
            });
        }

        // Early exit if this is the "correct" branch
        if (hasTarget && i >= iterations * 0.5) {
            break;
        }
    }

    self.postMessage({
        type: 'result',
        found: hasTarget,
        value: hasTarget ? result.toFixed(4) : null,
        branch,
        workerId,
        iterationsCompleted: hasTarget ? Math.floor(iterations * 0.5) : iterations
    });
}
