const drawBtn = document.getElementById('drawBtn');
const eqXInput = document.getElementById('eqX');
const eqYInput = document.getElementById('eqY');
const tMinInput = document.getElementById('tMin');
const tMaxInput = document.getElementById('tMax');
const stepsInput = document.getElementById('steps');
const stepsDisplay = document.getElementById('stepsDisplay');

const pointCountEl = document.getElementById('pointCount');
const calcTimeEl = document.getElementById('calcTime');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('curveCanvas');
const ctx = canvas.getContext('2d');

let worker;

stepsInput.addEventListener('input', () => stepsDisplay.textContent = stepsInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            calcTimeEl.textContent = `${data.duration}ms`;
            pointCountEl.textContent = data.points.length;
            drawCurve(data.points);
            drawBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            statusText.style.color = '#ef5350';
            drawBtn.disabled = false;
        }
    };
}

drawBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const eqX = eqXInput.value;
    const eqY = eqYInput.value;
    const tMin = parseFloat(tMinInput.value);
    const tMax = parseFloat(tMaxInput.value);
    const steps = parseInt(stepsInput.value);

    drawBtn.disabled = true;
    statusText.textContent = 'Calculating...';
    statusText.style.color = '#eceff1';
    calcTimeEl.textContent = '-';
    pointCountEl.textContent = '-';

    worker.postMessage({
        command: 'compute',
        eqX, eqY, tMin, tMax, steps
    });
});

function drawCurve(points) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (points.length === 0) return;

    // Auto-scale
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let p of points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }

    // Add padding
    const padding = 40;
    const rangeX = Math.max(maxX - minX, 0.0001);
    const rangeY = Math.max(maxY - minY, 0.0001);
    
    // Preserve aspect ratio?
    // Let's fit to box.
    const scaleX = (w - 2 * padding) / rangeX;
    const scaleY = (h - 2 * padding) / rangeY;
    
    // Use smaller scale to fit both
    const scale = Math.min(scaleX, scaleY);
    
    const cx = w / 2;
    const cy = h / 2;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    ctx.beginPath();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;

    for (let i = 0; i < points.length; i++) {
        // Center the curve
        const px = cx + (points[i].x - centerX) * scale;
        const py = cy - (points[i].y - centerY) * scale; // Flip Y

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Draw Axis
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Visual center lines
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.stroke();
}

initWorker();
// Initial draw (Heart curve default)
drawBtn.click();
