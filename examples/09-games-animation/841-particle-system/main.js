/**
 * Particle System - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let frameCount = 0;
let lastFpsUpdate = 0;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);

    canvas.addEventListener('mousemove', (e) => {
        if (isRunning && worker) {
            const rect = canvas.getBoundingClientRect();
            worker.postMessage({
                type: 'MOUSE',
                payload: {
                    x: (e.clientX - rect.left) * (canvas.width / rect.width),
                    y: (e.clientY - rect.top) * (canvas.height / rect.height)
                }
            });
        }
    });

    clearCanvas();
});

function clearCanvas() {
    ctx.fillStyle = 'rgba(26, 26, 46, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function start() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    worker.postMessage({
        type: 'START',
        payload: {
            maxParticles: parseInt(document.getElementById('particleCount').value),
            spawnRate: parseInt(document.getElementById('spawnRate').value),
            width: canvas.width,
            height: canvas.height
        }
    });

    isRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    frameCount = 0;
    lastFpsUpdate = performance.now();

    requestAnimationFrame(render);
}

function stop() {
    if (worker) {
        worker.postMessage({ type: 'STOP' });
        worker.terminate();
        worker = null;
    }
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    clearCanvas();
}

let currentParticles = [];

function handleMessage(event) {
    const { type, payload } = event.data;

    if (type === 'STATE') {
        currentParticles = payload.particles;
        document.getElementById('activeCount').textContent = payload.count;
        document.getElementById('updateTime').textContent = `${payload.updateTime.toFixed(2)} ms`;
    }
}

function render(timestamp) {
    if (!isRunning) return;

    frameCount++;
    if (timestamp - lastFpsUpdate >= 1000) {
        document.getElementById('fps').textContent = frameCount;
        frameCount = 0;
        lastFpsUpdate = timestamp;
    }

    // Clear with trail effect
    ctx.fillStyle = 'rgba(26, 26, 46, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw particles
    for (const p of currentParticles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`;
        ctx.fill();
    }

    requestAnimationFrame(render);
}
