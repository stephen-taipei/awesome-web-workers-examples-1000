/**
 * Tile Engine - Main Thread
 */
let worker = null, canvas, ctx;
let tileMap = null;
let cameraX = 0, cameraY = 0;
const tileSize = 32, mapWidth = 100, mapHeight = 100;
const tileColors = ['#4a9eff', '#28a745', '#8B4513', '#808080', '#ffc107', '#6c757d'];

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    document.getElementById('generateBtn').addEventListener('click', generate);

    document.addEventListener('keydown', e => {
        const speed = 20;
        if (e.key === 'ArrowUp') cameraY = Math.max(0, cameraY - speed);
        if (e.key === 'ArrowDown') cameraY = Math.min(mapHeight * tileSize - canvas.height, cameraY + speed);
        if (e.key === 'ArrowLeft') cameraX = Math.max(0, cameraX - speed);
        if (e.key === 'ArrowRight') cameraX = Math.min(mapWidth * tileSize - canvas.width, cameraX + speed);
        render();
    });

    generate();
});

function generate() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = e => {
        if (e.data.type === 'MAP') {
            tileMap = e.data.payload.tiles;
            cameraX = 0; cameraY = 0;
            render();
        }
    };
    worker.postMessage({ type: 'GENERATE', payload: { width: mapWidth, height: mapHeight } });
}

function render() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!tileMap) return;

    const startCol = Math.floor(cameraX / tileSize);
    const startRow = Math.floor(cameraY / tileSize);
    const endCol = Math.min(mapWidth, startCol + Math.ceil(canvas.width / tileSize) + 1);
    const endRow = Math.min(mapHeight, startRow + Math.ceil(canvas.height / tileSize) + 1);
    const offsetX = -(cameraX % tileSize);
    const offsetY = -(cameraY % tileSize);

    for (let r = startRow; r < endRow; r++) {
        for (let c = startCol; c < endCol; c++) {
            const tile = tileMap[r * mapWidth + c];
            const x = (c - startCol) * tileSize + offsetX;
            const y = (r - startRow) * tileSize + offsetY;
            ctx.fillStyle = tileColors[tile];
            ctx.fillRect(x, y, tileSize - 1, tileSize - 1);
        }
    }

    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText(`Camera: ${cameraX}, ${cameraY}`, 10, 20);
}
