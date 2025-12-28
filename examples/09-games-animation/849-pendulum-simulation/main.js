/**
 * Pendulum Simulation - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let pendulumData = null;
let trail = [];

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('resetBtn').addEventListener('click', reset);

    clearCanvas();
});

function clearCanvas() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function start() {
    if (worker) worker.terminate();

    trail = [];
    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    worker.postMessage({
        type: 'START',
        payload: {
            length1: parseInt(document.getElementById('length1').value),
            length2: parseInt(document.getElementById('length2').value),
            mass1: parseInt(document.getElementById('mass1').value),
            mass2: parseInt(document.getElementById('mass2').value),
            angle1: Math.PI / 2,
            angle2: Math.PI / 2,
            originX: canvas.width / 2,
            originY: 150
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
}

function reset() {
    stop();
    trail = [];
    clearCanvas();
}

function handleMessage(event) {
    const { type, payload } = event.data;

    if (type === 'STATE') {
        pendulumData = payload;
        trail.push({ x: payload.x2, y: payload.y2 });
        if (trail.length > 500) trail.shift();
    }
}

function render() {
    if (!isRunning) return;

    // Fade effect
    ctx.fillStyle = 'rgba(26, 26, 46, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (pendulumData) {
        const { originX, originY, x1, y1, x2, y2, mass1, mass2 } = pendulumData;

        // Draw trail
        if (trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) {
                const alpha = i / trail.length;
                ctx.strokeStyle = `hsla(${(i * 0.5) % 360}, 70%, 60%, ${alpha})`;
                ctx.lineTo(trail[i].x, trail[i].y);
            }
            ctx.stroke();
        }

        // Draw pivot
        ctx.beginPath();
        ctx.arc(originX, originY, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#6c757d';
        ctx.fill();

        // Draw rods
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw masses
        ctx.beginPath();
        ctx.arc(x1, y1, mass1 / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#4a9eff';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x2, y2, mass2 / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#dc3545';
        ctx.fill();
        ctx.stroke();
    }

    requestAnimationFrame(render);
}
