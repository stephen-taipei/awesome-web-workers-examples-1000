/**
 * Isometric Engine - Main Thread
 */
let worker = null, canvas, ctx;
let heightMap = null;
const gridSize = 20, tileWidth = 40, tileHeight = 20;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    document.getElementById('generateBtn').addEventListener('click', generate);
    generate();
});

function generate() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = e => {
        if (e.data.type === 'TERRAIN') {
            heightMap = e.data.payload.heights;
            render();
        }
    };
    worker.postMessage({ type: 'GENERATE', payload: { size: gridSize } });
}

function isoToScreen(x, y, z) {
    return {
        sx: canvas.width / 2 + (x - y) * tileWidth / 2,
        sy: 100 + (x + y) * tileHeight / 2 - z * 10
    };
}

function render() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!heightMap) return;

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const h = heightMap[y * gridSize + x];
            const pos = isoToScreen(x, y, h);

            // Top face
            const hue = 120 + h * 10;
            ctx.fillStyle = `hsl(${hue}, 50%, ${40 + h * 5}%)`;
            ctx.beginPath();
            ctx.moveTo(pos.sx, pos.sy - tileHeight / 2);
            ctx.lineTo(pos.sx + tileWidth / 2, pos.sy);
            ctx.lineTo(pos.sx, pos.sy + tileHeight / 2);
            ctx.lineTo(pos.sx - tileWidth / 2, pos.sy);
            ctx.closePath();
            ctx.fill();

            // Left face
            ctx.fillStyle = `hsl(${hue}, 50%, ${30 + h * 3}%)`;
            ctx.beginPath();
            ctx.moveTo(pos.sx - tileWidth / 2, pos.sy);
            ctx.lineTo(pos.sx, pos.sy + tileHeight / 2);
            ctx.lineTo(pos.sx, pos.sy + tileHeight / 2 + h * 5);
            ctx.lineTo(pos.sx - tileWidth / 2, pos.sy + h * 5);
            ctx.closePath();
            ctx.fill();

            // Right face
            ctx.fillStyle = `hsl(${hue}, 50%, ${35 + h * 4}%)`;
            ctx.beginPath();
            ctx.moveTo(pos.sx + tileWidth / 2, pos.sy);
            ctx.lineTo(pos.sx, pos.sy + tileHeight / 2);
            ctx.lineTo(pos.sx, pos.sy + tileHeight / 2 + h * 5);
            ctx.lineTo(pos.sx + tileWidth / 2, pos.sy + h * 5);
            ctx.closePath();
            ctx.fill();
        }
    }
}
