// Grid Search - Main Thread

const functionSelect = document.getElementById('functionSelect');
const rangeXMin = document.getElementById('rangeXMin');
const rangeXMax = document.getElementById('rangeXMax');
const rangeYMin = document.getElementById('rangeYMin');
const rangeYMax = document.getElementById('rangeYMax');
const gridSizeInput = document.getElementById('gridSize');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

const statusSection = document.getElementById('statusSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const evalCountEl = document.getElementById('evalCount');

const canvas = document.getElementById('heatmapCanvas');
const ctx = canvas.getContext('2d');
const cbMax = document.getElementById('cbMax');
const cbMin = document.getElementById('cbMin');

const resultSection = document.getElementById('resultSection');
const bestXEl = document.getElementById('bestX');
const bestYEl = document.getElementById('bestY');
const minValEl = document.getElementById('minVal');
const timeElapsedEl = document.getElementById('timeElapsed');

let worker = null;
let startTime = 0;

// Function definitions (stringified for worker)
const functions = {
    sphere: 'x*x + y*y',
    rosenbrock: 'Math.pow(1-x, 2) + 100*Math.pow(y-x*x, 2)',
    himmelblau: 'Math.pow(x*x+y-11, 2) + Math.pow(x+y*y-7, 2)',
    rastrigin: '20 + x*x - 10*Math.cos(2*Math.PI*x) + y*y - 10*Math.cos(2*Math.PI*y)',
    ackley: '-20*Math.exp(-0.2*Math.sqrt(0.5*(x*x+y*y))) - Math.exp(0.5*(Math.cos(2*Math.PI*x)+Math.cos(2*Math.PI*y))) + Math.E + 20'
};

// Default ranges
const ranges = {
    sphere: [-5, 5, -5, 5],
    rosenbrock: [-2, 2, -1, 3],
    himmelblau: [-6, 6, -6, 6],
    rastrigin: [-5.12, 5.12, -5.12, 5.12],
    ackley: [-5, 5, -5, 5]
};

functionSelect.addEventListener('change', () => {
    const val = functionSelect.value;
    const r = ranges[val];
    rangeXMin.value = r[0];
    rangeXMax.value = r[1];
    rangeYMin.value = r[2];
    rangeYMax.value = r[3];
});

startBtn.addEventListener('click', startSearch);
stopBtn.addEventListener('click', stopSearch);

function startSearch() {
    const funcName = functionSelect.value;
    const funcBody = functions[funcName];
    const xMin = parseFloat(rangeXMin.value);
    const xMax = parseFloat(rangeXMax.value);
    const yMin = parseFloat(rangeYMin.value);
    const yMax = parseFloat(rangeYMax.value);
    const size = parseInt(gridSizeInput.value);

    if (xMin >= xMax || yMin >= yMax) {
        alert("Invalid range");
        return;
    }

    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = handleWorkerMessage;

    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusSection.classList.remove('hidden');
    resultSection.classList.add('hidden');

    // Reset canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    startTime = performance.now();

    worker.postMessage({
        type: 'start',
        funcBody,
        xMin, xMax,
        yMin, yMax,
        size
    });
}

function stopSearch() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

let heatmapData = null;
let minZ = Infinity, maxZ = -Infinity;

function handleWorkerMessage(e) {
    const data = e.data;

    if (data.type === 'progress') {
        const percent = (data.completed / data.total * 100).toFixed(1);
        progressBar.style.width = percent + '%';
        progressText.textContent = percent + '%';
        evalCountEl.textContent = `${data.completed} / ${data.total} evaluations`;

        // Accumulate data for rendering
        if (!heatmapData) {
            heatmapData = new Float32Array(data.total);
            minZ = Infinity;
            maxZ = -Infinity;
        }

        // data.chunk contains { index, value }
        for (const item of data.chunk) {
            heatmapData[item.index] = item.value;
            if (item.value < minZ) minZ = item.value;
            if (item.value > maxZ) maxZ = item.value;
        }

        // Progressive update (throttle could be good but for now update every chunk)
        renderHeatmap(data.size);

    } else if (data.type === 'result') {
        const endTime = performance.now();
        stopSearch(); // Cleanup

        progressBar.style.width = '100%';
        progressText.textContent = '100%';

        resultSection.classList.remove('hidden');
        bestXEl.textContent = data.bestX.toFixed(6);
        bestYEl.textContent = data.bestY.toFixed(6);
        minValEl.textContent = data.bestVal.toFixed(6);
        timeElapsedEl.textContent = ((endTime - startTime) / 1000).toFixed(2) + 's';

        // Final render to ensure everything is correct
        // The worker sends back the best point, but we already have the data in heatmapData
        // We might want to highlight the best point
        highlightBestPoint(data.bestX, data.bestY, data.xMin, data.xMax, data.yMin, data.yMax);
    }
}

function renderHeatmap(size) {
    if (!heatmapData) return;

    // We render to an offscreen canvas or ImageData directly
    const imgData = ctx.createImageData(size, size);
    const d = imgData.data; // RGBA

    // For heatmap color mapping
    // Simple mapping: Min (Blue) -> Max (Red)
    // Actually standard is Blue -> Cyan -> Green -> Yellow -> Red

    const range = maxZ - minZ || 1;

    for (let i = 0; i < heatmapData.length; i++) {
        const val = heatmapData[i];
        if (isNaN(val)) continue; // Not computed yet

        // Normalize 0..1
        const t = (val - minZ) / range;

        // Color map: HSL from 240 (Blue) to 0 (Red)
        // t=0 -> 240, t=1 -> 0
        const hue = (1 - t) * 240;

        const [r, g, b] = hslToRgb(hue / 360, 1, 0.5);

        // Grid is row-major from top-left?
        // Worker loops: y from min to max, x from min to max.
        // Canvas is y from top to bottom.
        // Let's assume standard Cartesian: y grows up.
        // So row 0 corresponds to yMin (bottom of graph), which should be drawn at canvas bottom.

        // i = yIndex * size + xIndex
        const xIndex = i % size;
        const yIndex = Math.floor(i / size);

        // Map yIndex (0 at bottom) to canvas y (0 at top)
        // Canvas Y = size - 1 - yIndex
        const canvasY = size - 1 - yIndex;
        const canvasIndex = (canvasY * size + xIndex) * 4;

        d[canvasIndex] = r;
        d[canvasIndex + 1] = g;
        d[canvasIndex + 2] = b;
        d[canvasIndex + 3] = 255;
    }

    // Create a temporary canvas to scale up to the display canvas size
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    tempCanvas.getContext('2d').putImageData(imgData, 0, 0);

    // Draw scaled
    ctx.imageSmoothingEnabled = false; // Keep pixelated for clarity of grid
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);

    // Update labels
    cbMin.textContent = minZ.toExponential(2);
    cbMax.textContent = maxZ.toExponential(2);
}

function highlightBestPoint(x, y, xMin, xMax, yMin, yMax) {
    const w = canvas.width;
    const h = canvas.height;

    const px = ((x - xMin) / (xMax - xMin)) * w;
    const py = h - ((y - yMin) / (yMax - yMin)) * h;

    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.stroke();
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
