const animateBtn = document.getElementById('animateBtn');
const axisX = document.getElementById('axisX');
const axisY = document.getElementById('axisY');
const axisZ = document.getElementById('axisZ');
const angleInput = document.getElementById('angle');
const angleDisplay = document.getElementById('angleDisplay');
const qCurrentDisplay = document.getElementById('qCurrent');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('qCanvas');
const ctx = canvas.getContext('2d');

let worker;

angleInput.addEventListener('input', () => angleDisplay.textContent = angleInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'frame') {
            drawCube(data.vertices, data.faces);
            qCurrentDisplay.textContent = `[${data.q.w.toFixed(2)}, ${data.q.x.toFixed(2)}, ${data.q.y.toFixed(2)}, ${data.q.z.toFixed(2)}]`;
        } else if (type === 'done') {
            statusText.textContent = 'Idle';
            animateBtn.disabled = false;
        }
    };
}

animateBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const x = parseFloat(axisX.value);
    const y = parseFloat(axisY.value);
    const z = parseFloat(axisZ.value);
    const deg = parseFloat(angleInput.value);

    animateBtn.disabled = true;
    statusText.textContent = 'Animating...';

    worker.postMessage({
        command: 'animate',
        targetAxis: { x, y, z },
        targetAngleDeg: deg,
        duration: 2000 // ms
    });
});

function drawCube(vertices, faces) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    const cx = w / 2;
    const cy = h / 2;
    const scale = 100;

    // Draw Axes (Static)
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ddd';
    ctx.beginPath(); ctx.moveTo(cx-200, cy); ctx.lineTo(cx+200, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy-200); ctx.lineTo(cx, cy+200); ctx.stroke();

    // Helper: Project 3D -> 2D
    const project = (v) => ({
        x: cx + v.x * scale,
        y: cy - v.y * scale // Flip Y
    });

    // Draw Faces (Simple wireframe, no hidden line removal for simplicity)
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0277bd';
    ctx.lineJoin = 'round';

    faces.forEach(face => {
        ctx.beginPath();
        const start = project(vertices[face[0]]);
        ctx.moveTo(start.x, start.y);
        
        for (let i = 1; i < face.length; i++) {
            const p = project(vertices[face[i]]);
            ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Simple fill for depth cue
        ctx.fillStyle = 'rgba(3, 169, 244, 0.1)';
        ctx.fill();
    });
    
    // Draw vertices
    ctx.fillStyle = '#01579b';
    vertices.forEach(v => {
        const p = project(v);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
        ctx.fill();
    });
}

initWorker();
// Initial draw (identity)
worker.postMessage({ command: 'init' });
