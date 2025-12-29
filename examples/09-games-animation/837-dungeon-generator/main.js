/**
 * Dungeon Generator - Main Thread
 */

let worker = null;
let canvas, ctx;
let dungeon = [];

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('generateBtn').addEventListener('click', generateDungeon);

    clearCanvas();
});

function clearCanvas() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function generateDungeon() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    document.getElementById('generateBtn').disabled = true;

    worker.postMessage({
        type: 'GENERATE',
        payload: {
            width: parseInt(document.getElementById('dungeonWidth').value),
            height: parseInt(document.getElementById('dungeonHeight').value),
            minRoomSize: parseInt(document.getElementById('minRoomSize').value),
            maxDepth: parseInt(document.getElementById('maxDepth').value)
        }
    });
}

function handleMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            dungeon = payload.dungeon;
            renderDungeon(payload.rooms);
            break;
        case 'COMPLETE':
            dungeon = payload.dungeon;
            renderDungeon(payload.rooms);
            document.getElementById('roomCount').textContent = payload.roomCount;
            document.getElementById('corridorCount').textContent = payload.corridorCount;
            document.getElementById('genTime').textContent = `${payload.time.toFixed(2)} ms`;
            document.getElementById('generateBtn').disabled = false;
            break;
    }
}

function renderDungeon(rooms = []) {
    const dungeonWidth = dungeon[0]?.length || 0;
    const dungeonHeight = dungeon.length || 0;

    if (dungeonWidth === 0 || dungeonHeight === 0) return;

    const cellWidth = canvas.width / dungeonWidth;
    const cellHeight = canvas.height / dungeonHeight;

    clearCanvas();

    // Draw tiles
    for (let y = 0; y < dungeonHeight; y++) {
        for (let x = 0; x < dungeonWidth; x++) {
            const tile = dungeon[y][x];
            const px = x * cellWidth;
            const py = y * cellHeight;

            switch (tile) {
                case 0: // Wall
                    ctx.fillStyle = '#0f3460';
                    break;
                case 1: // Floor
                    ctx.fillStyle = '#2a2a4e';
                    break;
                case 2: // Corridor
                    ctx.fillStyle = '#3d3d6e';
                    break;
                case 3: // Door
                    ctx.fillStyle = '#ffc107';
                    break;
            }

            ctx.fillRect(px, py, cellWidth + 0.5, cellHeight + 0.5);
        }
    }

    // Draw room outlines
    ctx.strokeStyle = '#4a9eff44';
    ctx.lineWidth = 1;
    rooms.forEach(room => {
        ctx.strokeRect(
            room.x * cellWidth,
            room.y * cellHeight,
            room.width * cellWidth,
            room.height * cellHeight
        );
    });
}
