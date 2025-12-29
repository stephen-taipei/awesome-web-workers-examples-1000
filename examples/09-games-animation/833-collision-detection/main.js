/**
 * Collision Detection - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let currentState = null;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);

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
            objectCount: parseInt(document.getElementById('objectCount').value),
            cellSize: parseInt(document.getElementById('cellSize').value),
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
        currentState = payload;
        document.getElementById('collisionCount').textContent = payload.collisionCount;
        document.getElementById('checksSaved').textContent = `${payload.checksSaved.toFixed(1)}%`;
        document.getElementById('detectionTime').textContent = `${payload.detectionTime.toFixed(2)} ms`;
    }
}

function render() {
    if (!isRunning) return;

    if (currentState) {
        clearCanvas();

        // Draw grid
        ctx.strokeStyle = '#2a2a4e';
        ctx.lineWidth = 1;
        const cellSize = parseInt(document.getElementById('cellSize').value);
        for (let x = 0; x < canvas.width; x += cellSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += cellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw objects
        currentState.objects.forEach(obj => {
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
            ctx.fillStyle = obj.colliding ? '#dc3545' : '#4a9eff';
            ctx.fill();
        });
    }

    requestAnimationFrame(render);
}
