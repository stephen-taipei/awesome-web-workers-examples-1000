/**
 * Noise Terrain - Main Thread
 */

let worker = null;
let canvas, ctx;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('generateBtn').addEventListener('click', generateTerrain);
    document.getElementById('randomSeedBtn').addEventListener('click', () => {
        document.getElementById('seed').value = Math.floor(Math.random() * 1000000);
        generateTerrain();
    });

    // Auto-generate on parameter change
    ['scale', 'octaves', 'persistence'].forEach(id => {
        document.getElementById(id).addEventListener('input', generateTerrain);
    });

    generateTerrain();
});

function generateTerrain() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    const seed = parseInt(document.getElementById('seed').value);

    worker.postMessage({
        type: 'GENERATE',
        payload: {
            width: canvas.width,
            height: canvas.height,
            scale: parseInt(document.getElementById('scale').value),
            octaves: parseInt(document.getElementById('octaves').value),
            persistence: parseFloat(document.getElementById('persistence').value),
            seed
        }
    });
}

function handleMessage(event) {
    const { type, payload } = event.data;

    if (type === 'COMPLETE') {
        renderTerrain(payload.heightmap);
        document.getElementById('currentSeed').textContent = payload.seed;
        document.getElementById('genTime').textContent = `${payload.time.toFixed(2)} ms`;
    }
}

function renderTerrain(heightmap) {
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < heightmap.length; i++) {
        const height = heightmap[i];
        const color = getTerrainColor(height);
        const idx = i * 4;
        data[idx] = color.r;
        data[idx + 1] = color.g;
        data[idx + 2] = color.b;
        data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
}

function getTerrainColor(h) {
    if (h < 0.35) {
        const t = h / 0.35;
        return { r: 30 + t * 20, g: 60 + t * 60, b: 140 + t * 60 };
    }
    if (h < 0.4) return { r: 194, g: 178, b: 128 };
    if (h < 0.55) {
        const t = (h - 0.4) / 0.15;
        return { r: 86 - t * 30, g: 152 - t * 40, b: 77 - t * 20 };
    }
    if (h < 0.7) return { r: 56, g: 112, b: 57 };
    if (h < 0.85) {
        const t = (h - 0.7) / 0.15;
        return { r: 90 + t * 60, g: 90 + t * 60, b: 90 + t * 60 };
    }
    return { r: 245, g: 245, b: 250 };
}
