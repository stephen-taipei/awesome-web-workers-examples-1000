/**
 * AI Behavior Tree - Main Thread
 */
let worker = null, canvas, ctx, isRunning = false;
let aiData = null;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);
});

function start() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = e => {
        if (e.data.type === 'STATE') {
            aiData = e.data.payload;
            document.getElementById('activeNode').textContent = aiData.activeNode;
        }
    };
    worker.postMessage({ type: 'START', payload: { width: canvas.width, height: canvas.height } });
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

    if (aiData) {
        // Draw resources
        ctx.fillStyle = '#ffc107';
        for (const r of aiData.resources) {
            ctx.beginPath();
            ctx.arc(r.x, r.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw threats
        ctx.fillStyle = '#dc3545';
        for (const t of aiData.threats) {
            ctx.beginPath();
            ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw AI
        ctx.beginPath();
        ctx.arc(aiData.x, aiData.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#4a9eff';
        ctx.fill();

        // Health bar
        ctx.fillStyle = '#333';
        ctx.fillRect(aiData.x - 25, aiData.y - 35, 50, 8);
        ctx.fillStyle = aiData.health > 50 ? '#28a745' : '#dc3545';
        ctx.fillRect(aiData.x - 25, aiData.y - 35, aiData.health / 2, 8);

        // Action text
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(aiData.activeNode, aiData.x, aiData.y + 40);
    }

    requestAnimationFrame(render);
}
