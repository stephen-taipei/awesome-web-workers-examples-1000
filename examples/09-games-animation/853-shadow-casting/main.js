/**
 * Shadow Casting - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let boxes = [];
let shadowData = null;
let mouseX = 400, mouseY = 250;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('addBoxBtn').addEventListener('click', addBox);

    canvas.addEventListener('mousemove', handleMouse);

    initBoxes();
    clearCanvas();
});

function initBoxes() {
    boxes = [
        { x: 200, y: 150, w: 80, h: 80 },
        { x: 400, y: 200, w: 60, h: 100 },
        { x: 550, y: 300, w: 100, h: 60 },
        { x: 150, y: 350, w: 70, h: 70 }
    ];
}

function addBox() {
    boxes.push({
        x: 100 + Math.random() * 600,
        y: 100 + Math.random() * 300,
        w: 40 + Math.random() * 80,
        h: 40 + Math.random() * 80
    });
    if (worker) {
        worker.postMessage({ type: 'BOXES', payload: boxes });
    }
}

function handleMouse(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (worker && isRunning) {
        worker.postMessage({ type: 'LIGHT', payload: { x: mouseX, y: mouseY } });
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

    worker.postMessage({ type: 'START', payload: { boxes, width: canvas.width, height: canvas.height } });

    isRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;

    requestAnimationFrame(render);
}

function stop() {
    if (worker) { worker.terminate(); worker = null; }
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

function handleMessage(event) {
    if (event.data.type === 'SHADOWS') {
        shadowData = event.data.payload;
    }
}

function render() {
    if (!isRunning) return;

    clearCanvas();

    // Draw shadows
    if (shadowData) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        for (const shadow of shadowData.shadows) {
            ctx.beginPath();
            ctx.moveTo(shadow[0].x, shadow[0].y);
            for (let i = 1; i < shadow.length; i++) {
                ctx.lineTo(shadow[i].x, shadow[i].y);
            }
            ctx.closePath();
            ctx.fill();
        }
    }

    // Draw boxes
    ctx.fillStyle = '#4a9eff';
    for (const box of boxes) {
        ctx.fillRect(box.x, box.y, box.w, box.h);
    }

    // Draw light
    const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 50);
    gradient.addColorStop(0, '#ffc107');
    gradient.addColorStop(1, 'rgba(255, 193, 7, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 50, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(render);
}
