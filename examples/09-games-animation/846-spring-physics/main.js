/**
 * Spring Physics - Main Thread
 */

let worker = null;
let canvas, ctx;
let isRunning = false;
let systemData = null;
let dragIndex = -1;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('stopBtn').addEventListener('click', stop);

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', () => dragIndex = -1);
    canvas.addEventListener('mouseleave', () => dragIndex = -1);
    canvas.addEventListener('mousemove', handleMouseMove);

    clearCanvas();
});

function handleMouseDown(e) {
    if (!systemData) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    for (let i = 0; i < systemData.masses.length; i++) {
        const m = systemData.masses[i];
        if (m.fixed) continue;
        const dx = m.x - mx;
        const dy = m.y - my;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
            dragIndex = i;
            break;
        }
    }
}

function handleMouseMove(e) {
    if (dragIndex < 0 || !worker) return;
    const rect = canvas.getBoundingClientRect();
    worker.postMessage({
        type: 'DRAG',
        payload: {
            index: dragIndex,
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        }
    });
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
            springK: parseFloat(document.getElementById('springK').value),
            damping: parseFloat(document.getElementById('damping').value),
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
        systemData = payload;
        document.getElementById('energy').textContent = payload.energy.toFixed(2);
    }
}

function render() {
    if (!isRunning) return;

    clearCanvas();

    if (systemData) {
        // Draw springs
        for (const spring of systemData.springs) {
            const m1 = systemData.masses[spring.m1];
            const m2 = systemData.masses[spring.m2];

            // Spring stretch visualization
            const dx = m2.x - m1.x;
            const dy = m2.y - m1.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const stretch = Math.abs(length - spring.restLength) / spring.restLength;
            const color = stretch > 0.5 ? '#dc3545' : stretch > 0.2 ? '#ffc107' : '#28a745';

            // Draw coiled spring
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(m1.x, m1.y);

            const segments = 20;
            const amplitude = 8;
            for (let i = 1; i <= segments; i++) {
                const t = i / segments;
                const px = m1.x + dx * t;
                const py = m1.y + dy * t;
                const perpX = -dy / length * amplitude * Math.sin(t * Math.PI * 8);
                const perpY = dx / length * amplitude * Math.sin(t * Math.PI * 8);
                ctx.lineTo(px + perpX, py + perpY);
            }
            ctx.stroke();
        }

        // Draw masses
        for (let i = 0; i < systemData.masses.length; i++) {
            const m = systemData.masses[i];
            ctx.beginPath();
            ctx.arc(m.x, m.y, 15, 0, Math.PI * 2);
            ctx.fillStyle = m.fixed ? '#6c757d' : (i === dragIndex ? '#ffc107' : '#4a9eff');
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    requestAnimationFrame(render);
}
