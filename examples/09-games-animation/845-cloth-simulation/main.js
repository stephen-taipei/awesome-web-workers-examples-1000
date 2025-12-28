/**
 * Cloth Simulation - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let clothData = null;
let isDragging = false;
let mouseX = 0, mouseY = 0;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('resetBtn').addEventListener('click', reset);

    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        updateMouse(e);
    });
    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mouseleave', () => isDragging = false);
    canvas.addEventListener('mousemove', updateMouse);

    clearCanvas();
});

function updateMouse(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (isDragging && worker) {
        worker.postMessage({
            type: 'MOUSE',
            payload: { x: mouseX, y: mouseY, radius: 50 }
        });
    }
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
            resolution: parseInt(document.getElementById('resolution').value),
            stiffness: parseFloat(document.getElementById('stiffness').value),
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
}

function reset() {
    if (worker) {
        worker.postMessage({ type: 'RESET' });
    }
}

function handleMessage(event) {
    const { type, payload } = event.data;

    if (type === 'STATE') {
        clothData = payload;
        document.getElementById('pointCount').textContent = payload.points.length;
        document.getElementById('simTime').textContent = `${payload.simTime.toFixed(2)} ms`;
    }
}

function render() {
    if (!isRunning) return;

    clearCanvas();

    if (clothData) {
        const { points, resolution } = clothData;

        // Draw constraints (springs)
        ctx.strokeStyle = 'rgba(74, 158, 255, 0.5)';
        ctx.lineWidth = 1;

        for (let y = 0; y < resolution; y++) {
            for (let x = 0; x < resolution; x++) {
                const idx = y * resolution + x;
                const p = points[idx];

                if (x < resolution - 1) {
                    const right = points[idx + 1];
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(right.x, right.y);
                    ctx.stroke();
                }

                if (y < resolution - 1) {
                    const down = points[idx + resolution];
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(down.x, down.y);
                    ctx.stroke();
                }
            }
        }

        // Draw points
        ctx.fillStyle = '#4a9eff';
        for (const p of points) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.pinned ? 5 : 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    requestAnimationFrame(render);
}
