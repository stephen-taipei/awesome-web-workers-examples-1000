/**
 * A* Pathfinding - Main Thread
 */

let worker = null;
let canvas, ctx;
let gridSize = 40;
let grid = [];
let cellSize;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('generateBtn').addEventListener('click', generateGrid);
    document.getElementById('findPathBtn').addEventListener('click', findPath);

    generateGrid();
});

function generateGrid() {
    gridSize = parseInt(document.getElementById('gridSize').value);
    const obstacleRate = parseInt(document.getElementById('obstacleRate').value) / 100;
    cellSize = canvas.width / gridSize;

    grid = [];
    for (let y = 0; y < gridSize; y++) {
        grid[y] = [];
        for (let x = 0; x < gridSize; x++) {
            grid[y][x] = Math.random() < obstacleRate ? 1 : 0;
        }
    }

    // Clear start and end
    grid[0][0] = 0;
    grid[gridSize - 1][gridSize - 1] = 0;

    renderGrid();
    document.getElementById('pathLength').textContent = '-';
    document.getElementById('nodesExplored').textContent = '-';
    document.getElementById('searchTime').textContent = '-';
}

function renderGrid(explored = [], path = []) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const exploredSet = new Set(explored.map(n => `${n.x},${n.y}`));
    const pathSet = new Set(path.map(n => `${n.x},${n.y}`));

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const px = x * cellSize;
            const py = y * cellSize;

            if (grid[y][x] === 1) {
                ctx.fillStyle = '#6c757d';
            } else if (pathSet.has(`${x},${y}`)) {
                ctx.fillStyle = '#ffc107';
            } else if (exploredSet.has(`${x},${y}`)) {
                ctx.fillStyle = '#4a9eff44';
            } else {
                ctx.fillStyle = '#0f3460';
            }

            ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }
    }

    // Start
    ctx.fillStyle = '#28a745';
    ctx.fillRect(1, 1, cellSize - 2, cellSize - 2);

    // End
    ctx.fillStyle = '#dc3545';
    ctx.fillRect((gridSize - 1) * cellSize + 1, (gridSize - 1) * cellSize + 1, cellSize - 2, cellSize - 2);
}

function findPath() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    worker.postMessage({
        type: 'FIND_PATH',
        payload: {
            grid,
            start: { x: 0, y: 0 },
            end: { x: gridSize - 1, y: gridSize - 1 }
        }
    });
}

function handleMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            renderGrid(payload.explored, []);
            break;
        case 'RESULT':
            renderGrid(payload.explored, payload.path);
            document.getElementById('pathLength').textContent = payload.path.length || 'No path';
            document.getElementById('nodesExplored').textContent = payload.explored.length;
            document.getElementById('searchTime').textContent = `${payload.time.toFixed(2)} ms`;
            break;
    }
}
