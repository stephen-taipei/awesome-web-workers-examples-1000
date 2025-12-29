/**
 * Ray Casting - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let walls = [];
let rayData = null;
let mouseX = 400, mouseY = 250;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('regenerateBtn').addEventListener('click', regenerateWalls);

    canvas.addEventListener('mousemove', handleMouse);

    regenerateWalls();
    clearCanvas();
});

function handleMouse(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (worker && isRunning) {
        worker.postMessage({
            type: 'CAST',
            payload: { x: mouseX, y: mouseY }
        });
    }
}

function regenerateWalls() {
    walls = [];
    const count = parseInt(document.getElementById('wallCount').value);

    // Boundary walls
    walls.push({ x1: 0, y1: 0, x2: canvas.width, y2: 0 });
    walls.push({ x1: canvas.width, y1: 0, x2: canvas.width, y2: canvas.height });
    walls.push({ x1: canvas.width, y1: canvas.height, x2: 0, y2: canvas.height });
    walls.push({ x1: 0, y1: canvas.height, x2: 0, y2: 0 });

    // Random walls
    for (let i = 0; i < count; i++) {
        walls.push({
            x1: Math.random() * canvas.width,
            y1: Math.random() * canvas.height,
            x2: Math.random() * canvas.width,
            y2: Math.random() * canvas.height
        });
    }

    if (worker) {
        worker.postMessage({ type: 'WALLS', payload: walls });
    }

    render();
}

function clearCanvas() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function start() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    worker.postMessage({
        type: 'START',
        payload: {
            walls,
            rayCount: parseInt(document.getElementById('rayCount').value)
        }
    });

    isRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;

    requestAnimationFrame(renderLoop);
}

function stop() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

function handleMessage(event) {
    const { type, payload } = event.data;

    if (type === 'RAYS') {
        rayData = payload;
        document.getElementById('raysCount').textContent = payload.rays.length;
        document.getElementById('calcTime').textContent = `${payload.calcTime.toFixed(2)} ms`;
    }
}

function renderLoop() {
    if (!isRunning) return;
    render();
    requestAnimationFrame(renderLoop);
}

function render() {
    clearCanvas();

    // Draw visibility polygon
    if (rayData && rayData.rays.length > 0) {
        ctx.beginPath();
        ctx.moveTo(rayData.rays[0].hitX, rayData.rays[0].hitY);
        for (const ray of rayData.rays) {
            ctx.lineTo(ray.hitX, ray.hitY);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 200, 0.15)';
        ctx.fill();
    }

    // Draw rays
    if (rayData) {
        ctx.strokeStyle = 'rgba(255, 255, 100, 0.3)';
        ctx.lineWidth = 1;
        for (const ray of rayData.rays) {
            ctx.beginPath();
            ctx.moveTo(mouseX, mouseY);
            ctx.lineTo(ray.hitX, ray.hitY);
            ctx.stroke();
        }
    }

    // Draw walls
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 3;
    for (const wall of walls) {
        ctx.beginPath();
        ctx.moveTo(wall.x1, wall.y1);
        ctx.lineTo(wall.x2, wall.y2);
        ctx.stroke();
    }

    // Draw light source
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc107';
    ctx.fill();
}
