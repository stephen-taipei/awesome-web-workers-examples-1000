const evalBtn = document.getElementById('evalBtn');
const plotBtn = document.getElementById('plotBtn');
const exprInput = document.getElementById('expression');
const xInput = document.getElementById('xValue');
const startInput = document.getElementById('start');
const endInput = document.getElementById('end');
const stepInput = document.getElementById('step');

const resultDisplay = document.getElementById('resultDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('plotCanvas');
const ctx = canvas.getContext('2d');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'single') {
            resultDisplay.textContent = data.result.toFixed(6);
            timeDisplay.textContent = `${data.duration}ms`;
            statusText.textContent = 'Evaluated';
            evalBtn.disabled = false;
        } else if (type === 'batch') {
            timeDisplay.textContent = `${data.duration}ms`;
            statusText.textContent = 'Plotted';
            drawGraph(data.points);
            plotBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            statusText.style.color = 'red';
            evalBtn.disabled = false;
            plotBtn.disabled = false;
        }
    };
}

evalBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    const expr = exprInput.value;
    const x = parseFloat(xInput.value);

    evalBtn.disabled = true;
    statusText.textContent = 'Evaluating...';
    resultDisplay.textContent = '-';
    statusText.style.color = '#4a148c';

    worker.postMessage({
        command: 'eval',
        expression: expr,
        x: x
    });
});

plotBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    const expr = exprInput.value;
    const start = parseFloat(startInput.value);
    const end = parseFloat(endInput.value);
    const step = parseFloat(stepInput.value);

    plotBtn.disabled = true;
    statusText.textContent = 'Computing...';
    statusText.style.color = '#4a148c';

    worker.postMessage({
        command: 'plot',
        expression: expr,
        start, end, step
    });
});

function drawGraph(points) {
    // points: [{x, y}, ...]
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (points.length === 0) return;

    // Find ranges
    let minX = points[0].x, maxX = points[0].x;
    let minY = points[0].y, maxY = points[0].y;

    for (let p of points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 20;

    const mapX = (x) => padding + ((x - minX) / rangeX) * (w - 2 * padding);
    const mapY = (y) => h - padding - ((y - minY) / rangeY) * (h - 2 * padding);

    // Axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    // X-axis (y=0)
    if (minY <= 0 && maxY >= 0) {
        const y0 = mapY(0);
        ctx.beginPath();
        ctx.moveTo(0, y0);
        ctx.lineTo(w, y0);
        ctx.stroke();
    }
    // Y-axis (x=0)
    if (minX <= 0 && maxX >= 0) {
        const x0 = mapX(0);
        ctx.beginPath();
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0, h);
        ctx.stroke();
    }

    // Curve
    ctx.beginPath();
    ctx.strokeStyle = '#880e4f';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < points.length; i++) {
        const px = mapX(points[i].x);
        const py = mapY(points[i].y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
}

initWorker();
