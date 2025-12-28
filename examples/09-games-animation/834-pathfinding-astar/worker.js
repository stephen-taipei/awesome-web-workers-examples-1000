/**
 * A* Pathfinding - Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'FIND_PATH') {
        const startTime = performance.now();
        const result = astar(payload.grid, payload.start, payload.end);
        const endTime = performance.now();

        self.postMessage({
            type: 'RESULT',
            payload: {
                path: result.path,
                explored: result.explored,
                time: endTime - startTime
            }
        });
    }
};

function astar(grid, start, end) {
    const rows = grid.length;
    const cols = grid[0].length;

    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    const explored = [];

    const key = (n) => `${n.x},${n.y}`;
    gScore.set(key(start), 0);
    fScore.set(key(start), heuristic(start, end));

    let progressCounter = 0;

    while (openSet.length > 0) {
        // Get node with lowest fScore
        openSet.sort((a, b) => (fScore.get(key(a)) || Infinity) - (fScore.get(key(b)) || Infinity));
        const current = openSet.shift();

        explored.push(current);

        // Send progress every 50 nodes
        progressCounter++;
        if (progressCounter % 50 === 0) {
            self.postMessage({
                type: 'PROGRESS',
                payload: { explored: [...explored] }
            });
        }

        if (current.x === end.x && current.y === end.y) {
            return { path: reconstructPath(cameFrom, current), explored };
        }

        const neighbors = getNeighbors(current, rows, cols, grid);

        for (const neighbor of neighbors) {
            const tentativeG = (gScore.get(key(current)) || Infinity) + 1;

            if (tentativeG < (gScore.get(key(neighbor)) || Infinity)) {
                cameFrom.set(key(neighbor), current);
                gScore.set(key(neighbor), tentativeG);
                fScore.set(key(neighbor), tentativeG + heuristic(neighbor, end));

                if (!openSet.some(n => n.x === neighbor.x && n.y === neighbor.y)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    return { path: [], explored };
}

function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function getNeighbors(node, rows, cols, grid) {
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    const neighbors = [];

    for (const [dx, dy] of dirs) {
        const nx = node.x + dx;
        const ny = node.y + dy;

        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx] === 0) {
            neighbors.push({ x: nx, y: ny });
        }
    }

    return neighbors;
}

function reconstructPath(cameFrom, current) {
    const path = [current];
    const key = (n) => `${n.x},${n.y}`;

    while (cameFrom.has(key(current))) {
        current = cameFrom.get(key(current));
        path.unshift(current);
    }

    return path;
}
