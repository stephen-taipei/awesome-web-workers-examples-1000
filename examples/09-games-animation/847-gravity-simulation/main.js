/**
 * Gravity Simulation - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let bodies = [];
let trails = new Map();

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('addSunBtn').addEventListener('click', addSun);

    clearCanvas();
});

function clearCanvas() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function start() {
    if (worker) worker.terminate();

    trails.clear();
    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    worker.postMessage({
        type: 'START',
        payload: {
            bodyCount: parseInt(document.getElementById('bodyCount').value),
            gravityStrength: parseFloat(document.getElementById('gravityStrength').value),
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

function addSun() {
    if (worker) {
        worker.postMessage({ type: 'ADD_SUN' });
    }
}

function handleMessage(event) {
    const { type, payload } = event.data;

    if (type === 'STATE') {
        bodies = payload.bodies;
        document.getElementById('activeBodyCount').textContent = bodies.length;
        document.getElementById('simTime').textContent = `${payload.simTime.toFixed(2)} ms`;

        // Update trails
        for (const body of bodies) {
            if (!trails.has(body.id)) {
                trails.set(body.id, []);
            }
            const trail = trails.get(body.id);
            trail.push({ x: body.x, y: body.y });
            if (trail.length > 50) trail.shift();
        }
    }
}

function render() {
    if (!isRunning) return;

    // Fade effect
    ctx.fillStyle = 'rgba(10, 10, 26, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw trails
    trails.forEach((trail, id) => {
        if (trail.length < 2) return;
        const body = bodies.find(b => b.id === id);
        if (!body) return;

        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.strokeStyle = `rgba(${body.r}, ${body.g}, ${body.b}, 0.3)`;
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // Draw bodies
    for (const body of bodies) {
        // Glow
        const gradient = ctx.createRadialGradient(
            body.x, body.y, 0,
            body.x, body.y, body.radius * 3
        );
        gradient.addColorStop(0, `rgba(${body.r}, ${body.g}, ${body.b}, 0.5)`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${body.r}, ${body.g}, ${body.b})`;
        ctx.fill();
    }

    requestAnimationFrame(render);
}
