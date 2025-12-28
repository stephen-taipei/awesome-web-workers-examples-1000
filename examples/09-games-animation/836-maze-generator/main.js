/**
 * Maze Generator - Main Thread
 */

let worker = null;
let canvas, ctx;
let maze = [];
let mazeWidth, mazeHeight, cellSize;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('generateBtn').addEventListener('click', generateMaze);
    document.getElementById('solveBtn').addEventListener('click', solveMaze);

    clearCanvas();
});

function clearCanvas() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function generateMaze() {
    if (worker) worker.terminate();

    mazeWidth = parseInt(document.getElementById('mazeWidth').value);
    mazeHeight = parseInt(document.getElementById('mazeHeight').value);

    // Ensure odd dimensions
    if (mazeWidth % 2 === 0) mazeWidth++;
    if (mazeHeight % 2 === 0) mazeHeight++;

    cellSize = Math.min(canvas.width / mazeWidth, canvas.height / mazeHeight);

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    document.getElementById('generateBtn').disabled = true;
    document.getElementById('solveBtn').disabled = true;

    worker.postMessage({
        type: 'GENERATE',
        payload: { width: mazeWidth, height: mazeHeight }
    });
}

function solveMaze() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    worker.postMessage({
        type: 'SOLVE',
        payload: {
            maze,
            start: { x: 1, y: 1 },
            end: { x: mazeWidth - 2, y: mazeHeight - 2 }
        }
    });
}

function handleMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            maze = payload.maze;
            renderMaze(payload.current);
            break;
        case 'COMPLETE':
            maze = payload.maze;
            renderMaze();
            document.getElementById('cellCount').textContent = `${mazeWidth}x${mazeHeight}`;
            document.getElementById('genTime').textContent = `${payload.time.toFixed(2)} ms`;
            document.getElementById('generateBtn').disabled = false;
            document.getElementById('solveBtn').disabled = false;
            break;
        case 'SOLUTION':
            renderMaze(null, payload.path);
            break;
    }
}

function renderMaze(current = null, path = []) {
    clearCanvas();

    const pathSet = new Set(path.map(p => `${p.x},${p.y}`));
    const offsetX = (canvas.width - mazeWidth * cellSize) / 2;
    const offsetY = (canvas.height - mazeHeight * cellSize) / 2;

    for (let y = 0; y < mazeHeight; y++) {
        for (let x = 0; x < mazeWidth; x++) {
            const px = offsetX + x * cellSize;
            const py = offsetY + y * cellSize;

            if (maze[y] && maze[y][x] === 1) {
                ctx.fillStyle = '#0f3460';
            } else if (pathSet.has(`${x},${y}`)) {
                ctx.fillStyle = '#ffc107';
            } else {
                ctx.fillStyle = '#1a1a2e';
            }

            ctx.fillRect(px, py, cellSize, cellSize);
        }
    }

    // Draw current position
    if (current) {
        ctx.fillStyle = '#dc3545';
        ctx.fillRect(
            offsetX + current.x * cellSize,
            offsetY + current.y * cellSize,
            cellSize, cellSize
        );
    }

    // Start and end
    ctx.fillStyle = '#28a745';
    ctx.fillRect(offsetX + cellSize, offsetY + cellSize, cellSize, cellSize);
    ctx.fillStyle = '#dc3545';
    ctx.fillRect(
        offsetX + (mazeWidth - 2) * cellSize,
        offsetY + (mazeHeight - 2) * cellSize,
        cellSize, cellSize
    );
}
