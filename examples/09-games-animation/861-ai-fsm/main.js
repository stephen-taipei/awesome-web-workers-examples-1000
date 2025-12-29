/**
 * AI FSM - Main Thread
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
            document.getElementById('state').textContent = aiData.currentState;
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
        // Draw patrol points
        ctx.fillStyle = '#2a2a4e';
        for (const point of aiData.patrolPoints) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw AI agent
        const colors = { IDLE: '#ffc107', PATROL: '#28a745', CHASE: '#dc3545', FLEE: '#17a2b8' };
        ctx.beginPath();
        ctx.arc(aiData.x, aiData.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = colors[aiData.currentState] || '#4a9eff';
        ctx.fill();

        // Direction indicator
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(aiData.x, aiData.y);
        ctx.lineTo(aiData.x + Math.cos(aiData.angle) * 30, aiData.y + Math.sin(aiData.angle) * 30);
        ctx.stroke();

        // State label
        ctx.fillStyle = '#fff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(aiData.currentState, aiData.x, aiData.y - 30);
    }

    requestAnimationFrame(render);
}
