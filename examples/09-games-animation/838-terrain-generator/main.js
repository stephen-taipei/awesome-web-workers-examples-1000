/**
 * Terrain Generator - Main Thread
 */

let worker = null;
let canvas, ctx;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('generateBtn').addEventListener('click', generateTerrain);

    clearCanvas();
});

function clearCanvas() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function generateTerrain() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    document.getElementById('generateBtn').disabled = true;

    worker.postMessage({
        type: 'GENERATE',
        payload: {
            size: parseInt(document.getElementById('size').value),
            roughness: parseFloat(document.getElementById('roughness').value)
        }
    });
}

function handleMessage(event) {
    const { type, payload } = event.data;

    if (type === 'COMPLETE') {
        renderTerrain(payload.heightmap, payload.size);
        document.getElementById('pointCount').textContent = `${payload.size}x${payload.size}`;
        document.getElementById('genTime').textContent = `${payload.time.toFixed(2)} ms`;
        document.getElementById('generateBtn').disabled = false;
    }
}

function renderTerrain(heightmap, size) {
    const cellWidth = canvas.width / size;
    const cellHeight = canvas.height / size;

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const height = heightmap[y * size + x];
            const color = getTerrainColor(height);

            // Fill pixel area
            const startX = Math.floor(x * cellWidth);
            const startY = Math.floor(y * cellHeight);
            const endX = Math.floor((x + 1) * cellWidth);
            const endY = Math.floor((y + 1) * cellHeight);

            for (let py = startY; py < endY; py++) {
                for (let px = startX; px < endX; px++) {
                    const idx = (py * canvas.width + px) * 4;
                    data[idx] = color.r;
                    data[idx + 1] = color.g;
                    data[idx + 2] = color.b;
                    data[idx + 3] = 255;
                }
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function getTerrainColor(height) {
    // Water
    if (height < 0.3) {
        const t = height / 0.3;
        return {
            r: Math.floor(20 + t * 30),
            g: Math.floor(50 + t * 80),
            b: Math.floor(150 + t * 50)
        };
    }
    // Beach
    if (height < 0.35) {
        return { r: 210, g: 190, b: 140 };
    }
    // Grass
    if (height < 0.55) {
        const t = (height - 0.35) / 0.2;
        return {
            r: Math.floor(50 + t * 20),
            g: Math.floor(150 - t * 40),
            b: Math.floor(50 + t * 10)
        };
    }
    // Forest
    if (height < 0.7) {
        return { r: 34, g: 100, b: 34 };
    }
    // Mountain
    if (height < 0.85) {
        const t = (height - 0.7) / 0.15;
        return {
            r: Math.floor(100 + t * 50),
            g: Math.floor(100 + t * 50),
            b: Math.floor(100 + t * 50)
        };
    }
    // Snow
    return { r: 250, g: 250, b: 255 };
}
