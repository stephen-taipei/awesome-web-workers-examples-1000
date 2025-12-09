// Golden Section Search - Main Thread

const functionSelect = document.getElementById('functionSelect');
const customFunctionGroup = document.getElementById('customFunctionGroup');
const customFunctionInput = document.getElementById('customFunction');
const rangeAInput = document.getElementById('rangeA');
const rangeBInput = document.getElementById('rangeB');
const toleranceInput = document.getElementById('tolerance');
const solveBtn = document.getElementById('solveBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const resultX = document.getElementById('resultX');
const resultY = document.getElementById('resultY');
const iterationsEl = document.getElementById('iterations');
const execTimeEl = document.getElementById('execTime');
const historyTable = document.getElementById('historyTable');

const canvas = document.getElementById('searchCanvas');
const ctx = canvas.getContext('2d');

let worker = null;
let currentFunctionStr = '';

// Predefined functions
const predefinedFunctions = {
    parabola: { str: 'Math.pow(x-2, 2)', range: [0, 5] },
    cosine: { str: 'Math.cos(x) + Math.pow(x, 2)/10', range: [-5, 5] },
    quartic: { str: 'Math.pow(x, 4) - 3*Math.pow(x, 3) + 2', range: [1, 3] },
    custom: { str: '', range: [0, 10] }
};

// Handle function selection
functionSelect.addEventListener('change', () => {
    const val = functionSelect.value;
    if (val === 'custom') {
        customFunctionGroup.style.display = 'block';
    } else {
        customFunctionGroup.style.display = 'none';
        rangeAInput.value = predefinedFunctions[val].range[0];
        rangeBInput.value = predefinedFunctions[val].range[1];
    }
    updateVisualization(true);
});

// Update function string on custom input
customFunctionInput.addEventListener('input', () => {
    updateVisualization(true);
});

rangeAInput.addEventListener('change', () => updateVisualization(true));
rangeBInput.addEventListener('change', () => updateVisualization(true));

// Initialize Worker
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const data = e.data;
        if (data.type === 'progress') {
            updateProgress(data);
        } else if (data.type === 'result') {
            showResult(data);
        } else if (data.type === 'error') {
            alert('Error: ' + data.message);
            resetUI();
        }
    };
}

function updateProgress(data) {
    progressBar.style.width = data.percent + '%';
    progressText.textContent = `Iteration ${data.iteration}: Interval [${data.a.toFixed(5)}, ${data.b.toFixed(5)}]`;

    // Visualize current step
    drawSearchStep(data);
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    resultX.textContent = data.minX.toFixed(8);
    resultY.textContent = data.minY.toFixed(8);
    iterationsEl.textContent = data.iterations;
    execTimeEl.textContent = data.execTime.toFixed(2) + ' ms';

    renderHistory(data.history);

    // Final visualization
    drawFinalResult(data);
}

function renderHistory(history) {
    let html = '<table><tr><th>Iter</th><th>a</th><th>b</th><th>x1</th><th>x2</th><th>f(x1)</th><th>f(x2)</th></tr>';

    // Show first few, some middle, and last few if too long
    const maxRows = 20;
    const step = Math.max(1, Math.floor(history.length / maxRows));

    for (let i = 0; i < history.length; i += step) {
        const h = history[i];
        html += `<tr>
            <td>${h.iter}</td>
            <td>${h.a.toFixed(4)}</td>
            <td>${h.b.toFixed(4)}</td>
            <td>${h.x1.toFixed(4)}</td>
            <td>${h.x2.toFixed(4)}</td>
            <td>${h.f1.toFixed(4)}</td>
            <td>${h.f2.toFixed(4)}</td>
        </tr>`;
    }

    // Ensure last row is shown
    if (history.length > 0 && (history.length - 1) % step !== 0) {
        const h = history[history.length - 1];
        html += `<tr>
            <td>${h.iter}</td>
            <td>${h.a.toFixed(4)}</td>
            <td>${h.b.toFixed(4)}</td>
            <td>${h.x1.toFixed(4)}</td>
            <td>${h.x2.toFixed(4)}</td>
            <td>${h.f1.toFixed(4)}</td>
            <td>${h.f2.toFixed(4)}</td>
        </tr>`;
    }

    html += '</table>';
    historyTable.innerHTML = html;
}

function getFunctionString() {
    const val = functionSelect.value;
    return val === 'custom' ? customFunctionInput.value : predefinedFunctions[val].str;
}

function solve() {
    const funcStr = getFunctionString();
    const a = parseFloat(rangeAInput.value);
    const b = parseFloat(rangeBInput.value);
    const tol = parseFloat(toleranceInput.value);

    if (isNaN(a) || isNaN(b) || isNaN(tol)) {
        alert('Please enter valid numbers');
        return;
    }

    if (a >= b) {
        alert('Range start (a) must be less than range end (b)');
        return;
    }

    // Reset UI
    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    // Init Worker and start
    initWorker();
    worker.postMessage({
        funcStr, a, b, tol
    });
}

function resetUI() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    updateVisualization(true);
}

// Visualization Logic
function updateVisualization(isReset = false) {
    const funcStr = getFunctionString();
    const rangeA = parseFloat(rangeAInput.value);
    const rangeB = parseFloat(rangeBInput.value);

    if (!funcStr || isNaN(rangeA) || isNaN(rangeB)) return;

    try {
        const f = new Function('x', 'return ' + funcStr);
        drawFunction(f, rangeA, rangeB);
    } catch (e) {
        // Invalid function string, ignore
    }
}

function drawFunction(f, minX, maxX) {
    const w = canvas.width;
    const h = canvas.height;
    const pad = 40;

    // Clear
    ctx.fillStyle = '#0c0a09';
    ctx.fillRect(0, 0, w, h);

    // Determine Y range
    let minY = Infinity, maxY = -Infinity;
    const step = (maxX - minX) / w;
    const points = [];

    for (let i = 0; i <= w; i++) {
        const x = minX + i * step;
        try {
            const y = f(x);
            if (isFinite(y)) {
                points.push({x, y});
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        } catch (e) {}
    }

    if (minY === Infinity) return; // Error in evaluation

    // Add padding to Y range
    const yRange = maxY - minY || 1;
    minY -= yRange * 0.1;
    maxY += yRange * 0.1;

    // Scales
    const scaleX = (w - 2 * pad) / (maxX - minX);
    const scaleY = (h - 2 * pad) / (maxY - minY);

    const mapX = (x) => pad + (x - minX) * scaleX;
    const mapY = (y) => h - pad - (y - minY) * scaleY;

    // Grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // X axis
    if (minY <= 0 && maxY >= 0) {
        const y0 = mapY(0);
        ctx.moveTo(pad, y0);
        ctx.lineTo(w - pad, y0);
    }
    // Y axis
    if (minX <= 0 && maxX >= 0) {
        const x0 = mapX(0);
        ctx.moveTo(x0, pad);
        ctx.lineTo(x0, h - pad);
    }
    ctx.stroke();

    // Plot function
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let first = true;
    for (const p of points) {
        if (first) {
            ctx.moveTo(mapX(p.x), mapY(p.y));
            first = false;
        } else {
            ctx.lineTo(mapX(p.x), mapY(p.y));
        }
    }
    ctx.stroke();

    // Store scales for later overlay
    canvas.dataset.minX = minX;
    canvas.dataset.maxX = maxX;
    canvas.dataset.minY = minY;
    canvas.dataset.maxY = maxY;
}

function drawSearchStep(data) {
    const minX = parseFloat(canvas.dataset.minX);
    const maxX = parseFloat(canvas.dataset.maxX);
    const minY = parseFloat(canvas.dataset.minY);
    const maxY = parseFloat(canvas.dataset.maxY);

    const w = canvas.width;
    const h = canvas.height;
    const pad = 40;

    const scaleX = (w - 2 * pad) / (maxX - minX);
    const mapX = (x) => pad + (x - minX) * scaleX;

    // Redraw function first to clear previous overlays (optimization: could use layers)
    updateVisualization();

    // Draw interval [a, b]
    ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
    const xA = mapX(data.a);
    const xB = mapX(data.b);
    ctx.fillRect(xA, pad, xB - xA, h - 2 * pad);

    // Draw boundary lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(xA, pad); ctx.lineTo(xA, h - pad);
    ctx.moveTo(xB, pad); ctx.lineTo(xB, h - pad);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw points x1 and x2
    // We assume f(x1) and f(x2) are not passed in progress event unless we add them
    // But we can approximate vertical position or just draw lines
}

function drawFinalResult(data) {
    updateVisualization();

    const minX = parseFloat(canvas.dataset.minX);
    const maxX = parseFloat(canvas.dataset.maxX);
    const minY = parseFloat(canvas.dataset.minY);
    const maxY = parseFloat(canvas.dataset.maxY);

    const w = canvas.width;
    const h = canvas.height;
    const pad = 40;

    const scaleX = (w - 2 * pad) / (maxX - minX);
    const scaleY = (h - 2 * pad) / (maxY - minY);

    const mapX = (x) => pad + (x - minX) * scaleX;
    const mapY = (y) => h - pad - (y - minY) * scaleY;

    // Draw min point
    const x = data.minX;
    const y = data.minY;

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(mapX(x), mapY(y), 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`min (${x.toFixed(3)}, ${y.toFixed(3)})`, mapX(x) + 10, mapY(y) - 10);
}

solveBtn.addEventListener('click', solve);
resetBtn.addEventListener('click', resetUI);

// Initial draw
updateVisualization(true);
