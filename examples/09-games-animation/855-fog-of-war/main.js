/**
 * Fog of War - Main Thread
 */
let worker = null, canvas, ctx, isRunning = false;
let unit = { x: 400, y: 300, visionRadius: 100 };
let fogData = null, explored = null;
const gridSize = 20;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('resetBtn').addEventListener('click', resetFog);

    document.addEventListener('keydown', e => {
        const speed = 5;
        if (e.key === 'ArrowUp') unit.y -= speed;
        if (e.key === 'ArrowDown') unit.y += speed;
        if (e.key === 'ArrowLeft') unit.x -= speed;
        if (e.key === 'ArrowRight') unit.x += speed;
        unit.x = Math.max(0, Math.min(canvas.width, unit.x));
        unit.y = Math.max(0, Math.min(canvas.height, unit.y));
    });
});

function resetFog() {
    if (worker) worker.postMessage({ type: 'RESET' });
}

function start() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = e => {
        if (e.data.type === 'FOG') {
            fogData = e.data.payload.currentVision;
            explored = e.data.payload.explored;
        }
    };
    worker.postMessage({ type: 'START', payload: { width: canvas.width, height: canvas.height, gridSize } });
    isRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    update();
}

function stop() {
    if (worker) { worker.terminate(); worker = null; }
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

function update() {
    if (!isRunning) return;
    worker.postMessage({ type: 'UPDATE', payload: { unit } });
    render();
    requestAnimationFrame(update);
}

function render() {
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw terrain
    for (let y = 0; y < canvas.height; y += 40) {
        for (let x = 0; x < canvas.width; x += 40) {
            if (Math.random() > 0.95) {
                ctx.fillStyle = '#3a5a3a';
                ctx.fillRect(x, y, 40, 40);
            }
        }
    }

    // Draw fog
    if (fogData && explored) {
        const cols = Math.ceil(canvas.width / gridSize);
        const rows = Math.ceil(canvas.height / gridSize);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                if (!explored[idx]) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                    ctx.fillRect(c * gridSize, r * gridSize, gridSize, gridSize);
                } else if (!fogData[idx]) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(c * gridSize, r * gridSize, gridSize, gridSize);
                }
            }
        }
    }

    // Draw unit
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#4a9eff';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
}
