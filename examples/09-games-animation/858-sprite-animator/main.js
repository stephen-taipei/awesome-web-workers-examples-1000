/**
 * Sprite Animator - Main Thread
 */
let worker = null, canvas, ctx, isRunning = false;
let currentFrame = { index: 0, data: null };

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
    document.getElementById('animation').addEventListener('change', changeAnimation);
    document.getElementById('speed').addEventListener('input', changeSpeed);
});

function start() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = e => {
        if (e.data.type === 'FRAME') {
            currentFrame = e.data.payload;
            document.getElementById('frame').textContent = currentFrame.index;
        }
    };
    worker.postMessage({
        type: 'START',
        payload: {
            animation: document.getElementById('animation').value,
            fps: parseInt(document.getElementById('speed').value)
        }
    });
    isRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    render();
}

function stop() {
    if (worker) { worker.terminate(); worker = null; }
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
}

function changeAnimation() {
    if (worker) worker.postMessage({ type: 'ANIMATION', payload: document.getElementById('animation').value });
}

function changeSpeed() {
    if (worker) worker.postMessage({ type: 'SPEED', payload: parseInt(document.getElementById('speed').value) });
}

function render() {
    if (!isRunning) return;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentFrame.data) {
        const size = 100;
        const x = canvas.width / 2 - size / 2;
        const y = canvas.height / 2 - size / 2;

        // Draw sprite placeholder based on frame data
        ctx.fillStyle = currentFrame.data.color;
        ctx.fillRect(x + currentFrame.data.offsetX, y + currentFrame.data.offsetY, size, size);

        // Draw limbs
        ctx.fillStyle = '#ffc107';
        currentFrame.data.limbs.forEach(limb => {
            ctx.fillRect(x + limb.x, y + limb.y, limb.w, limb.h);
        });
    }

    requestAnimationFrame(render);
}
