/**
 * Skeletal Animation - Main Thread
 */
let worker = null, canvas, ctx, isRunning = false;
let bones = [];

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
});

function start() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = e => { if (e.data.type === 'BONES') bones = e.data.payload; };
    worker.postMessage({ type: 'START' });
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

function render() {
    if (!isRunning) return;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2, cy = canvas.height / 2;

    // Draw bones
    ctx.strokeStyle = '#4a9eff';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    for (const bone of bones) {
        ctx.beginPath();
        ctx.moveTo(cx + bone.x1, cy + bone.y1);
        ctx.lineTo(cx + bone.x2, cy + bone.y2);
        ctx.stroke();

        // Joint
        ctx.beginPath();
        ctx.arc(cx + bone.x1, cy + bone.y1, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffc107';
        ctx.fill();
    }

    requestAnimationFrame(render);
}
