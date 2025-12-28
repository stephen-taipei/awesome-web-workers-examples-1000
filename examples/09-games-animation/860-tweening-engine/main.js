/**
 * Tweening Engine - Main Thread
 */
let worker = null, canvas, ctx;
let tweenData = null;
let selectedEase = 'easeOutQuad';

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    document.getElementById('playBtn').addEventListener('click', play);
    document.querySelectorAll('.ease-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ease-btn').forEach(b => b.style.background = '');
            btn.style.background = '#4a9eff';
            selectedEase = btn.dataset.ease;
        });
    });
    render();
});

function play() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = e => { if (e.data.type === 'TWEEN') tweenData = e.data.payload; };
    worker.postMessage({ type: 'START', payload: { ease: selectedEase, duration: 2000 } });
}

function render() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw path
    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(100, 200);
    ctx.lineTo(700, 200);
    ctx.stroke();
    ctx.setLineDash([]);

    if (tweenData) {
        // Draw trail
        if (tweenData.history.length > 1) {
            ctx.strokeStyle = '#4a9eff44';
            ctx.lineWidth = 20;
            ctx.beginPath();
            ctx.moveTo(tweenData.history[0].x, tweenData.history[0].y);
            for (const p of tweenData.history) ctx.lineTo(p.x, p.y);
            ctx.stroke();
        }

        // Draw ball
        ctx.beginPath();
        ctx.arc(tweenData.x, tweenData.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#4a9eff';
        ctx.fill();

        // Progress bar
        ctx.fillStyle = '#28a745';
        ctx.fillRect(100, 350, 600 * tweenData.progress, 20);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(100, 350, 600, 20);
    }

    requestAnimationFrame(render);
}
