/**
 * Dijkstra Pathfinding - Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'FIND_PATH') {
        const startTime = performance.now();
        const result = dijkstra(payload.terrain, payload.start, payload.end);
        const endTime = performance.now();

        self.postMessage({
            type: 'RESULT',
            payload: {
                path: result.path,
                visited: result.visited,
                cost: result.cost,
                time: endTime - startTime
            }
        });
    }
};

function dijkstra(terrain, start, end) {
    const rows = terrain.length;
    const cols = terrain[0].length;

    const dist = new Map();
    const prev = new Map();
    const visited = [];
    const unvisited = [];

    const key = (n) => `${n.x},${n.y}`;

    // Initialize
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const node = { x, y };
            dist.set(key(node), Infinity);
            unvisited.push(node);
        }
    }

    dist.set(key(start), 0);
    let progressCounter = 0;

    while (unvisited.length > 0) {
        // Get minimum distance node
        unvisited.sort((a, b) => (dist.get(key(a)) || Infinity) - (dist.get(key(b)) || Infinity));
        const current = unvisited.shift();

        if (dist.get(key(current)) === Infinity) break;

        visited.push(current);

        progressCounter++;
        if (progressCounter % 30 === 0) {
            self.postMessage({
                type: 'PROGRESS',
                payload: { visited: [...visited] }
            });
        }

        if (current.x === end.x && current.y === end.y) {
            return {
                path: reconstructPath(prev, current),
                visited,
                cost: dist.get(key(current))
            };
        }

        const neighbors = getNeighbors(current, rows, cols);

        for (const neighbor of neighbors) {
            const idx = unvisited.findIndex(n => n.x === neighbor.x && n.y === neighbor.y);
            if (idx === -1) continue;

            const alt = dist.get(key(current)) + terrain[neighbor.y][neighbor.x];

            if (alt < dist.get(key(neighbor))) {
                dist.set(key(neighbor), alt);
                prev.set(key(neighbor), current);
            }
        }
    }

    return { path: [], visited, cost: 0 };
}

function getNeighbors(node, rows, cols) {
    const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    const neighbors = [];

    for (const [dx, dy] of dirs) {
        const nx = node.x + dx;
        const ny = node.y + dy;

        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            neighbors.push({ x: nx, y: ny });
        }
    }

    return neighbors;
}

function reconstructPath(prev, current) {
    const path = [current];
    const key = (n) => `${n.x},${n.y}`;

    while (prev.has(key(current))) {
        current = prev.get(key(current));
        path.unshift(current);
    }

    return path;
}
