/**
 * Procedural City - Main Thread
 */

let worker = null;
let canvas, ctx;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('generateBtn').addEventListener('click', generateCity);

    generateCity();
});

function generateCity() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    document.getElementById('generateBtn').disabled = true;

    worker.postMessage({
        type: 'GENERATE',
        payload: {
            gridSize: parseInt(document.getElementById('gridSize').value),
            density: parseFloat(document.getElementById('density').value)
        }
    });
}

function handleMessage(event) {
    const { type, payload } = event.data;

    if (type === 'COMPLETE') {
        renderCity(payload);
        document.getElementById('buildingCount').textContent = payload.buildingCount;
        document.getElementById('roadCount').textContent = payload.roadCount;
        document.getElementById('genTime').textContent = `${payload.time.toFixed(2)} ms`;
        document.getElementById('generateBtn').disabled = false;
    }
}

function renderCity(city) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const blockSize = canvas.width / city.gridSize;
    const roadWidth = blockSize * 0.15;

    // Draw roads first
    ctx.fillStyle = '#3d3d6e';
    city.roads.forEach(road => {
        if (road.horizontal) {
            ctx.fillRect(0, road.y * blockSize - roadWidth / 2, canvas.width, roadWidth);
        } else {
            ctx.fillRect(road.x * blockSize - roadWidth / 2, 0, roadWidth, canvas.height);
        }
    });

    // Draw buildings
    city.buildings.forEach(building => {
        const x = building.x * blockSize + roadWidth;
        const y = building.y * blockSize + roadWidth;
        const size = blockSize - roadWidth * 2;

        // Building base
        const heightRatio = building.height / 10;
        const r = Math.floor(40 + heightRatio * 60);
        const g = Math.floor(80 + heightRatio * 80);
        const b = Math.floor(120 + heightRatio * 80);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, size * building.width, size * building.depth);

        // Building outline
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, size * building.width, size * building.depth);

        // Windows
        ctx.fillStyle = '#ffc10744';
        const windowSize = size * 0.1;
        const spacing = size * 0.15;
        for (let wy = y + spacing; wy < y + size * building.depth - windowSize; wy += spacing) {
            for (let wx = x + spacing; wx < x + size * building.width - windowSize; wx += spacing) {
                if (Math.random() > 0.3) {
                    ctx.fillRect(wx, wy, windowSize, windowSize);
                }
            }
        }
    });

    // Draw parks
    ctx.fillStyle = '#28a74566';
    city.parks.forEach(park => {
        const x = park.x * blockSize + roadWidth;
        const y = park.y * blockSize + roadWidth;
        const size = blockSize - roadWidth * 2;
        ctx.fillRect(x, y, size, size);
    });
}
