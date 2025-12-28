/**
 * Particle Physics - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let currentParticles = [];

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('attraction').addEventListener('input', updateAttraction);

    clearCanvas();
});

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
            particleCount: parseInt(document.getElementById('particleCount').value),
            attraction: parseFloat(document.getElementById('attraction').value),
            width: canvas.width,
            height: canvas.height
        }
    });

    isRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;

    requestAnimationFrame(render);
}

function stop() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    clearCanvas();
}

function updateAttraction() {
    if (worker) {
        worker.postMessage({
            type: 'SET_ATTRACTION',
            payload: parseFloat(document.getElementById('attraction').value)
        });
    }
}

function handleMessage(event) {
    const { type, payload } = event.data;

    if (type === 'STATE') {
        currentParticles = payload.particles;
        document.getElementById('collisions').textContent = payload.collisions;
        document.getElementById('physicsTime').textContent = `${payload.physicsTime.toFixed(2)} ms`;
    }
}

function render() {
    if (!isRunning) return;

    clearCanvas();

    for (const p of currentParticles) {
        // Draw glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
        gradient.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, 0.5)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${p.r}, ${p.g}, ${p.b})`;
        ctx.fill();
    }

    requestAnimationFrame(render);
}
