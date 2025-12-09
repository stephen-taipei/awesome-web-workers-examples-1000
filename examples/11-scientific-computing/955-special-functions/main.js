const calcBtn = document.getElementById('calcBtn');
const funcTypeSelect = document.getElementById('funcType');
const xStartInput = document.getElementById('xStart');
const xEndInput = document.getElementById('xEnd');
const stepInput = document.getElementById('step');
const paramYInput = document.getElementById('paramY');
const inputYGroup = document.getElementById('inputYGroup');

const pointCountEl = document.getElementById('pointCount');
const calcTimeEl = document.getElementById('calcTime');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('plotCanvas');
const ctx = canvas.getContext('2d');

let worker;

funcTypeSelect.addEventListener('change', () => {
    if (funcTypeSelect.value === 'beta') {
        inputYGroup.classList.remove('hidden');
    } else {
        inputYGroup.classList.add('hidden');
    }
});

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            calcTimeEl.textContent = `${data.duration}ms`;
            pointCountEl.textContent = data.points.length;
            drawGraph(data.points);
            calcBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            statusText.style.color = '#d32f2f';
            calcBtn.disabled = false;
        }
    };
}

calcBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const type = funcTypeSelect.value;
    const start = parseFloat(xStartInput.value);
    const end = parseFloat(xEndInput.value);
    const step = parseFloat(stepInput.value);
    const paramY = parseFloat(paramYInput.value);

    calcBtn.disabled = true;
    statusText.textContent = 'Calculating...';
    statusText.style.color = '#4a148c';
    calcTimeEl.textContent = '-';
    pointCountEl.textContent = '-';

    worker.postMessage({
        command: 'compute',
        type, start, end, step, paramY
    });
});

function drawGraph(points) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (points.length === 0) return;

    // Auto scale
    // Filter out Infinities for scaling logic
    const validPoints = points.filter(p => isFinite(p.y) && Math.abs(p.y) < 1000);
    
    if (validPoints.length === 0) return;

    let minX = validPoints[0].x, maxX = validPoints[0].x;
    let minY = validPoints[0].y, maxY = validPoints[0].y;

    for (let p of validPoints) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }
    
    // Pad Y range slightly
    const rangeY = (maxY - minY) || 1;
    minY -= rangeY * 0.1;
    maxY += rangeY * 0.1;

    const mapX = x => ((x - minX) / (maxX - minX)) * (w - 40) + 20;
    const mapY = y => h - (((y - minY) / (maxY - minY)) * (h - 40) + 20);

    // Axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // X Axis (y=0)
    if (minY < 0 && maxY > 0) {
        const y0 = mapY(0);
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.lineTo(w, y0);
        ctx.stroke();
    }
    
    // Y Axis (x=0)
    if (minX < 0 && maxX > 0) {
        const x0 = mapX(0);
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0, h);
        ctx.stroke();
    }

    // Curve
    ctx.beginPath();
    ctx.strokeStyle = '#7b1fa2';
    ctx.lineWidth = 2;

    let first = true;
    for (let p of points) {
        if (!isFinite(p.y)) {
            first = true; // Break line at singularity
            continue;
        }
        
        // Clip visually huge values
        let drawY = p.y;
        if (drawY > maxY) drawY = maxY;
        if (drawY < minY) drawY = minY;

        const px = mapX(p.x);
        const py = mapY(drawY);

        if (first) {
            ctx.moveTo(px, py);
            first = false;
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.stroke();
}

initWorker();
