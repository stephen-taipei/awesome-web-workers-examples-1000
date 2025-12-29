/**
 * Particle Emitter - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let currentEmitterType = 'fire';
let currentParticles = [];

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('clearBtn').addEventListener('click', clearEmitters);

    document.querySelectorAll('.emitter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.emitter-btn').forEach(b => b.style.background = '');
            btn.style.background = '#4a9eff';
            currentEmitterType = btn.dataset.type;
        });
    });

    canvas.addEventListener('click', (e) => {
        if (isRunning && worker) {
            const rect = canvas.getBoundingClientRect();
            worker.postMessage({
                type: 'ADD_EMITTER',
                payload: {
                    x: (e.clientX - rect.left) * (canvas.width / rect.width),
                    y: (e.clientY - rect.top) * (canvas.height / rect.height),
                    emitterType: currentEmitterType
                }
            });
        }
    });

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
        payload: { width: canvas.width, height: canvas.height }
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
}

function clearEmitters() {
    if (worker) {
        worker.postMessage({ type: 'CLEAR' });
    }
}

function handleMessage(event) {
    const { type, payload } = event.data;

    if (type === 'STATE') {
        currentParticles = payload.particles;
        document.getElementById('emitterCount').textContent = payload.emitterCount;
        document.getElementById('particleCount').textContent = payload.particleCount;
    }
}

function render() {
    if (!isRunning) return;

    ctx.fillStyle = 'rgba(26, 26, 46, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const p of currentParticles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`;
        ctx.fill();
    }

    requestAnimationFrame(render);
}
