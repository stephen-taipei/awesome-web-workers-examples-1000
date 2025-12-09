// Bayesian Optimization - Main Thread

const targetFuncSelect = document.getElementById('targetFunc');
const initialSamplesInput = document.getElementById('initialSamples');
const maxIterationsInput = document.getElementById('maxIterations');
const explorationInput = document.getElementById('exploration');

const stepBtn = document.getElementById('stepBtn');
const runBtn = document.getElementById('runBtn');
const resetBtn = document.getElementById('resetBtn');

const canvas = document.getElementById('boCanvas');
const ctx = canvas.getContext('2d');
const loadingOverlay = document.getElementById('loadingOverlay');

const iterDisplay = document.getElementById('iterDisplay');
const bestXDisplay = document.getElementById('bestXDisplay');
const bestYDisplay = document.getElementById('bestYDisplay');
const nextSampleDisplay = document.getElementById('nextSampleDisplay');

let worker = null;
let isRunning = false;
let currentIteration = 0;
let maxIterations = 10;
let currentState = null; // Store last state from worker

// Problem Definitions
const problems = {
    sin_x_x: {
        xMin: 0, xMax: 10,
        yMin: -0.5, yMax: 1.2
    },
    gramacy_lee: {
        xMin: 0.5, xMax: 2.5,
        yMin: -1, yMax: 2.5
    },
    forrester: {
        xMin: 0, xMax: 1,
        yMin: -10, yMax: 10 // Approximate
    }
};

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
}

function handleWorkerMessage(e) {
    const data = e.data;

    if (data.type === 'init') {
        currentState = data;
        updateUI(data);
        loadingOverlay.classList.add('hidden');
        stepBtn.disabled = false;
        runBtn.disabled = false;
    } else if (data.type === 'step') {
        currentState = data;
        currentIteration = data.iteration;
        updateUI(data);

        if (isRunning && currentIteration < maxIterations) {
            // Auto run: request next step immediately
            requestStep();
        } else {
            isRunning = false;
            loadingOverlay.classList.add('hidden');
            stepBtn.disabled = (currentIteration >= maxIterations);
            runBtn.disabled = false;
        }
    } else if (data.type === 'error') {
        alert("Error: " + data.message);
        reset();
    }
}

function updateUI(data) {
    iterDisplay.textContent = data.iteration;

    // Find best observed
    let bestY = Infinity;
    let bestX = null;
    if (data.X && data.Y) {
        for (let i = 0; i < data.Y.length; i++) {
            if (data.Y[i] < bestY) {
                bestY = data.Y[i];
                bestX = data.X[i];
            }
        }
    }

    if (bestX !== null) {
        bestXDisplay.textContent = bestX.toFixed(6);
        bestYDisplay.textContent = bestY.toFixed(6);
    }

    if (data.nextX !== undefined) {
        nextSampleDisplay.textContent = data.nextX.toFixed(6);
    } else {
        nextSampleDisplay.textContent = '-';
    }

    drawVisualization(data);
}

function drawVisualization(data) {
    const w = canvas.width;
    const h = canvas.height;
    const pad = 40;

    // Clear
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, w, h);

    const prob = problems[targetFuncSelect.value];
    const xMin = prob.xMin;
    const xMax = prob.xMax;

    // Determine Y range for plotting (including acquisition function)
    // We split plot: Top 70% for Function/GP, Bottom 30% for Acquisition
    const hMain = h * 0.7;
    const hAcq = h * 0.3;

    // Find scale for main plot
    // Include true function range and GP confidence intervals
    let yMin = prob.yMin, yMax = prob.yMax;

    if (data.gpMean) {
        const allY = [...data.gpMean.map((v, i) => v + 2 * data.gpStd[i]), ...data.gpMean.map((v, i) => v - 2 * data.gpStd[i]), ...data.Y];
        yMin = Math.min(yMin, ...allY);
        yMax = Math.max(yMax, ...allY);
    }
    // Add padding
    const yRange = yMax - yMin || 1;
    yMin -= yRange * 0.1;
    yMax += yRange * 0.1;

    const mapX = (x) => pad + (x - xMin) / (xMax - xMin) * (w - 2 * pad);
    const mapY = (y) => hMain - pad - (y - yMin) / (yMax - yMin) * (hMain - 2 * pad);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, hMain - pad); ctx.lineTo(w - pad, hMain - pad); // X axis main
    ctx.moveTo(pad, pad); ctx.lineTo(pad, hMain - pad); // Y axis main
    ctx.stroke();

    // 1. Draw Confidence Interval (95% = +/- 2 std)
    if (data.gpMean) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.beginPath();
        let first = true;

        const numPoints = data.gpMean.length;
        const step = (xMax - xMin) / (numPoints - 1);

        // Top edge
        for (let i = 0; i < numPoints; i++) {
            const x = xMin + i * step;
            const y = data.gpMean[i] + 1.96 * data.gpStd[i];
            if (first) { ctx.moveTo(mapX(x), mapY(y)); first = false; }
            else ctx.lineTo(mapX(x), mapY(y));
        }
        // Bottom edge (reverse)
        for (let i = numPoints - 1; i >= 0; i--) {
            const x = xMin + i * step;
            const y = data.gpMean[i] - 1.96 * data.gpStd[i];
            ctx.lineTo(mapX(x), mapY(y));
        }
        ctx.closePath();
        ctx.fill();

        // 2. Draw GP Mean
        ctx.strokeStyle = '#3b82f6'; // Blue
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        first = true;
        for (let i = 0; i < numPoints; i++) {
            const x = xMin + i * step;
            const y = data.gpMean[i];
            if (first) { ctx.moveTo(mapX(x), mapY(y)); first = false; }
            else ctx.lineTo(mapX(x), mapY(y));
        }
        ctx.stroke();
    }

    // 3. Draw True Function (Dashed White)
    if (data.trueFuncY) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        let first = true;
        const numPoints = data.trueFuncY.length;
        const step = (xMax - xMin) / (numPoints - 1);
        for (let i = 0; i < numPoints; i++) {
            const x = xMin + i * step;
            const y = data.trueFuncY[i];
            if (first) { ctx.moveTo(mapX(x), mapY(y)); first = false; }
            else ctx.lineTo(mapX(x), mapY(y));
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 4. Draw Samples
    if (data.X) {
        ctx.fillStyle = '#ef4444'; // Red
        for (let i = 0; i < data.X.length; i++) {
            ctx.beginPath();
            ctx.arc(mapX(data.X[i]), mapY(data.Y[i]), 4, 0, Math.PI * 2);
            ctx.fill();
        }
        // Highlight last sample
        if (data.X.length > 0) {
             const lastIdx = data.X.length - 1;
             ctx.strokeStyle = '#fff';
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.arc(mapX(data.X[lastIdx]), mapY(data.Y[lastIdx]), 6, 0, Math.PI * 2);
             ctx.stroke();
        }
    }

    // 5. Draw Acquisition Function (Bottom)
    if (data.ei) {
        const acqYMin = 0; // EI is non-negative
        const acqYMax = Math.max(...data.ei) * 1.1 || 0.1;

        const mapAcqY = (y) => h - pad - (y - acqYMin) / (acqYMax - acqYMin) * (hAcq - 2 * pad);

        // Separator line
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, hMain);
        ctx.lineTo(w - pad, hMain);
        ctx.stroke();

        // Plot EI
        ctx.fillStyle = 'rgba(16, 185, 129, 0.4)'; // Green fill
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const numPoints = data.ei.length;
        const step = (xMax - xMin) / (numPoints - 1);

        ctx.moveTo(mapX(xMin), mapAcqY(0));

        for (let i = 0; i < numPoints; i++) {
            const x = xMin + i * step;
            ctx.lineTo(mapX(x), mapAcqY(data.ei[i]));
        }
        ctx.lineTo(mapX(xMax), mapAcqY(0));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Next sample line
        if (data.nextX !== undefined) {
            ctx.strokeStyle = '#f472b6'; // Pink vertical line
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            const nextXPos = mapX(data.nextX);
            ctx.beginPath();
            ctx.moveTo(nextXPos, pad);
            ctx.lineTo(nextXPos, h - pad);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#f472b6';
            ctx.textAlign = 'center';
            ctx.font = '10px monospace';
            ctx.fillText('Next', nextXPos, h - pad + 12);
        }
    }

    // Labels
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('f(x) / GP Model', w / 2, pad - 10);
    ctx.fillText('Acquisition Function (EI)', w / 2, hMain + 20);
}

function reset() {
    initWorker();

    const funcName = targetFuncSelect.value;
    const initialSamples = parseInt(initialSamplesInput.value);
    maxIterations = parseInt(maxIterationsInput.value);

    isRunning = false;
    currentIteration = 0;
    currentState = null;

    loadingOverlay.classList.remove('hidden');
    stepBtn.disabled = true;
    runBtn.disabled = true;

    worker.postMessage({
        type: 'init',
        funcName,
        initialSamples
    });
}

function requestStep() {
    if (!currentState) return;

    loadingOverlay.classList.remove('hidden');
    const exploration = parseFloat(explorationInput.value);

    worker.postMessage({
        type: 'step',
        exploration
    });
}

stepBtn.addEventListener('click', () => {
    isRunning = false;
    requestStep();
});

runBtn.addEventListener('click', () => {
    isRunning = true;
    requestStep();
});

resetBtn.addEventListener('click', reset);
targetFuncSelect.addEventListener('change', reset);

// Initial start
reset();
