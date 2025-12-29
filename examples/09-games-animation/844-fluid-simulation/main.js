/**
 * Fluid Simulation - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let currentParticles = [];
let isDragging = false;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);

    canvas.addEventListener('mousedown', () => isDragging = true);
    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mouseleave', () => isDragging = false);
    canvas.addEventListener('mousemove', handleMouse);

    clearCanvas();
});

function handleMouse(e) {
    if (!isDragging || !worker) return;
    const rect = canvas.getBoundingClientRect();
    worker.postMessage({
        type: 'FORCE',
        payload: {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
            radius: 50,
            strength: 5
        }
    });
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
            particleCount: parseInt(document.getElementById('particleCount').value),
            viscosity: parseFloat(document.getElementById('viscosity').value),
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

function handleMessage(event) {
    const { type, payload } = event.data;

    if (type === 'STATE') {
        currentParticles = payload.particles;
        document.getElementById('activeParticles').textContent = payload.particles.length;
        document.getElementById('simTime').textContent = `${payload.simTime.toFixed(2)} ms`;
    }
}

function render() {
    if (!isRunning) return;

    clearCanvas();

    // Draw particles with metaball-like effect
    for (const p of currentParticles) {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2);
        gradient.addColorStop(0, `rgba(74, 158, 255, ${0.3 + p.density * 0.5})`);
        gradient.addColorStop(0.5, `rgba(74, 158, 255, ${0.1 + p.density * 0.2})`);
        gradient.addColorStop(1, 'rgba(74, 158, 255, 0)');

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    // Draw solid particles
    ctx.fillStyle = 'rgba(100, 180, 255, 0.8)';
    for (const p of currentParticles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    requestAnimationFrame(render);
}
