/**
 * Dijkstra Pathfinding - Main Thread
 */

let worker = null;
let canvas, ctx;
let gridSize = 30;
let terrain = [];
let cellSize;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('generateBtn').addEventListener('click', generateTerrain);
    document.getElementById('findPathBtn').addEventListener('click', findPath);

    generateTerrain();
});

function generateTerrain() {
    gridSize = parseInt(document.getElementById('gridSize').value);
    const variation = parseInt(document.getElementById('terrainVariation').value) / 100;
    cellSize = canvas.width / gridSize;

    terrain = [];
    for (let y = 0; y < gridSize; y++) {
        terrain[y] = [];
        for (let x = 0; x < gridSize; x++) {
            // Cost from 1-10, with variation
            terrain[y][x] = 1 + Math.floor(Math.random() * 9 * variation);
        }
    }

    renderTerrain();
    resetStats();
}

function resetStats() {
    document.getElementById('pathCost').textContent = '-';
    document.getElementById('nodesVisited').textContent = '-';
    document.getElementById('searchTime').textContent = '-';
}

function renderTerrain(visited = [], path = []) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const visitedSet = new Set(visited.map(n => `${n.x},${n.y}`));
    const pathSet = new Set(path.map(n => `${n.x},${n.y}`));

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const px = x * cellSize;
            const py = y * cellSize;
            const cost = terrain[y][x];

            if (pathSet.has(`${x},${y}`)) {
                ctx.fillStyle = '#ffc107';
            } else if (visitedSet.has(`${x},${y}`)) {
                ctx.fillStyle = `rgba(74, 158, 255, 0.5)`;
            } else {
                const intensity = 255 - (cost - 1) * 20;
                ctx.fillStyle = `rgb(${intensity * 0.1}, ${intensity * 0.4}, ${intensity * 0.3})`;
            }

            ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

            // Show cost
            if (cellSize > 15) {
                ctx.fillStyle = '#fff';
                ctx.font = `${Math.max(8, cellSize * 0.4)}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(cost, px + cellSize / 2, py + cellSize / 2 + 4);
            }
        }
    }

    // Start and End markers
    ctx.fillStyle = '#28a745';
    ctx.fillRect(1, 1, cellSize - 2, cellSize - 2);
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
            terrain,
            start: { x: 0, y: 0 },
            end: { x: gridSize - 1, y: gridSize - 1 }
        }
    });
}

function handleMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            renderTerrain(payload.visited, []);
            break;
        case 'RESULT':
            renderTerrain(payload.visited, payload.path);
            document.getElementById('pathCost').textContent = payload.cost || 'No path';
            document.getElementById('nodesVisited').textContent = payload.visited.length;
            document.getElementById('searchTime').textContent = `${payload.time.toFixed(2)} ms`;
            break;
    }
}
