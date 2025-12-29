/**
 * Maze Generator - Web Worker
 * Recursive backtracking algorithm
 */

let maze = [];
let width, height;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'GENERATE':
            generateMaze(payload.width, payload.height);
            break;
        case 'SOLVE':
            maze = payload.maze;
            solveMaze(payload.start, payload.end);
            break;
    }
};

function generateMaze(w, h) {
    const startTime = performance.now();
    width = w;
    height = h;

    // Initialize maze with walls
    maze = [];
    for (let y = 0; y < height; y++) {
        maze[y] = [];
        for (let x = 0; x < width; x++) {
            maze[y][x] = 1; // Wall
        }
    }

    // Start from (1,1)
    const stack = [{ x: 1, y: 1 }];
    maze[1][1] = 0; // Path

    let stepCount = 0;

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors = getUnvisitedNeighbors(current.x, current.y);

        if (neighbors.length > 0) {
            // Choose random neighbor
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];

            // Remove wall between current and next
            const wallX = current.x + (next.x - current.x) / 2;
            const wallY = current.y + (next.y - current.y) / 2;
            maze[wallY][wallX] = 0;
            maze[next.y][next.x] = 0;

            stack.push(next);
        } else {
            stack.pop();
        }

        stepCount++;
        if (stepCount % 50 === 0) {
            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    maze: maze.map(row => [...row]),
                    current: stack[stack.length - 1] || current
                }
            });
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'COMPLETE',
        payload: {
            maze: maze.map(row => [...row]),
            time: endTime - startTime
        }
    });
}

function getUnvisitedNeighbors(x, y) {
    const neighbors = [];
    const dirs = [
        { dx: 0, dy: -2 },
        { dx: 2, dy: 0 },
        { dx: 0, dy: 2 },
        { dx: -2, dy: 0 }
    ];

    for (const { dx, dy } of dirs) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1) {
            if (maze[ny][nx] === 1) {
                neighbors.push({ x: nx, y: ny });
            }
        }
    }

    return neighbors;
}

function solveMaze(start, end) {
    const visited = new Set();
    const path = [];

    function dfs(x, y) {
        if (x === end.x && y === end.y) {
            path.push({ x, y });
            return true;
        }

        const key = `${x},${y}`;
        if (visited.has(key) || maze[y][x] === 1) return false;

        visited.add(key);
        path.push({ x, y });

        const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        for (const [dx, dy] of dirs) {
            if (dfs(x + dx, y + dy)) return true;
        }

        path.pop();
        return false;
    }

    dfs(start.x, start.y);

    self.postMessage({
        type: 'SOLUTION',
        payload: { path }
    });
}
