/**
 * Projectile Motion - Main Thread
 */

let worker = null;
let canvas, ctx;
let trajectories = [];
let currentProjectile = null;

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    document.getElementById('fireBtn').addEventListener('click', fire);
    document.getElementById('clearBtn').addEventListener('click', clear);

    worker = new Worker('worker.js');
    worker.onmessage = handleMessage;

    drawScene();
});

function drawScene() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground
    ctx.fillStyle = '#28a745';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);

    // Grid
    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height - 20);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height - 20; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Launcher
    const angle = parseInt(document.getElementById('angle').value);
    ctx.save();
    ctx.translate(50, canvas.height - 20);
    ctx.rotate(-angle * Math.PI / 180);
    ctx.fillStyle = '#6c757d';
    ctx.fillRect(0, -5, 40, 10);
    ctx.restore();

    // Draw past trajectories
    trajectories.forEach((traj, i) => {
        const alpha = 0.3 + (i / trajectories.length) * 0.5;
        ctx.strokeStyle = `rgba(74, 158, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (traj.points.length > 0) {
            ctx.moveTo(traj.points[0].x, canvas.height - 20 - traj.points[0].y);
            for (const p of traj.points) {
                ctx.lineTo(p.x, canvas.height - 20 - p.y);
            }
        }
        ctx.stroke();
    });

    // Draw current projectile
    if (currentProjectile) {
        // Trail
        ctx.strokeStyle = '#ffc107';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (currentProjectile.trail.length > 0) {
            ctx.moveTo(currentProjectile.trail[0].x, canvas.height - 20 - currentProjectile.trail[0].y);
            for (const p of currentProjectile.trail) {
                ctx.lineTo(p.x, canvas.height - 20 - p.y);
            }
        }
        ctx.stroke();

        // Ball
        ctx.beginPath();
        ctx.arc(currentProjectile.x, canvas.height - 20 - currentProjectile.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#dc3545';
        ctx.fill();
    }
}

function fire() {
    const angle = parseInt(document.getElementById('angle').value);
    const velocity = parseInt(document.getElementById('velocity').value);
    const airResistance = parseFloat(document.getElementById('airResistance').value);
    const gravity = parseFloat(document.getElementById('gravity').value);

    worker.postMessage({
        type: 'FIRE',
        payload: {
            x: 50,
            y: 0,
            angle: angle * Math.PI / 180,
            velocity,
            airResistance,
            gravity,
            groundY: 0
        }
    });
}

function clear() {
    trajectories = [];
    currentProjectile = null;
    document.getElementById('maxHeight').textContent = '-';
    document.getElementById('range').textContent = '-';
    document.getElementById('flightTime').textContent = '-';
    drawScene();
}

function handleMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'UPDATE':
            currentProjectile = payload;
            drawScene();
            break;
        case 'COMPLETE':
            trajectories.push({ points: payload.trail });
            currentProjectile = null;
            document.getElementById('maxHeight').textContent = `${payload.maxHeight.toFixed(1)} m`;
            document.getElementById('range').textContent = `${payload.range.toFixed(1)} m`;
            document.getElementById('flightTime').textContent = `${payload.flightTime.toFixed(2)} s`;
            drawScene();
            break;
    }
}
