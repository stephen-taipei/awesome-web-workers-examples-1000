/**
 * Physics Engine - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', startSimulation);
    document.getElementById('stopBtn').addEventListener('click', stopSimulation);
    document.getElementById('addBallBtn').addEventListener('click', addBall);

    canvas.addEventListener('click', (e) => {
        if (isRunning) {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            addBallAt(x, y);
        }
    });

    clearCanvas();
});

function clearCanvas() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function startSimulation() {
    if (worker) worker.terminate();

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    const gravity = parseFloat(document.getElementById('gravity').value);
    const restitution = parseFloat(document.getElementById('restitution').value);

    worker.postMessage({
        type: 'START',
        payload: {
            gravity,
            restitution,
            width: canvas.width,
            height: canvas.height
        }
    });

    isRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;

    requestAnimationFrame(render);
}

function stopSimulation() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    clearCanvas();
}

function addBall() {
    if (worker) {
        worker.postMessage({
            type: 'ADD_BODY',
            payload: {
                x: Math.random() * canvas.width,
                y: 50,
                radius: 10 + Math.random() * 20
            }
        });
    }
}

function addBallAt(x, y) {
    if (worker) {
        worker.postMessage({
            type: 'ADD_BODY',
            payload: { x, y, radius: 10 + Math.random() * 20 }
        });
    }
}

let currentState = null;

function handleMessage(event) {
    const { type, payload } = event.data;
    if (type === 'STATE') {
        currentState = payload;
        document.getElementById('bodyCount').textContent = payload.bodies.length;
        document.getElementById('physicsTime').textContent = `${payload.physicsTime.toFixed(2)} ms`;
    }
}

function render() {
    if (!isRunning) return;

    if (currentState) {
        clearCanvas();

        currentState.bodies.forEach(body => {
            ctx.beginPath();
            ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
            ctx.fillStyle = body.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    requestAnimationFrame(render);
}
