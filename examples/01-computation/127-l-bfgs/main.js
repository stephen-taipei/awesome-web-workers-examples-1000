// L-BFGS Optimizer - Main Thread

const functionSelect = document.getElementById('functionSelect');
const memorySizeInput = document.getElementById('memorySize');
const maxIterInput = document.getElementById('maxIter');
const toleranceInput = document.getElementById('tolerance');
const initialStepInput = document.getElementById('initialStep');

const optimizeBtn = document.getElementById('optimizeBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const iterCount = document.getElementById('iterCount');
const finalPos = document.getElementById('finalPos');
const finalValue = document.getElementById('finalValue');
const memUsed = document.getElementById('memUsed');

const optimCanvas = document.getElementById('optimCanvas');
const lossCanvas = document.getElementById('lossCanvas');
const optimCtx = optimCanvas.getContext('2d');
const lossCtx = lossCanvas.getContext('2d');

let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const data = e.data;
        if (data.type === 'progress') updateProgress(data);
        else if (data.type === 'result') showResult(data);
        else if (data.type === 'error') { alert(data.message); resetUI(); }
    };
}

function updateProgress(data) {
    progressContainer.classList.remove('hidden');
    progressBar.style.width = data.percent + '%';
    progressText.textContent = `Iteration ${data.iteration} - Loss: ${data.currentLoss.toExponential(4)} - Memory: ${data.memoryUsed}`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    iterCount.textContent = data.iterations + (data.converged ? ' (converged)' : '');
    finalPos.textContent = `(${data.finalPosition[0].toFixed(6)}, ${data.finalPosition[1].toFixed(6)})`;
    finalValue.textContent = data.finalValue.toExponential(6);
    memUsed.textContent = `${data.memoryUsed} pairs`;

    drawPath(data);
    drawLossHistory(data.lossHistory);
    resetUI();
}

function drawPath(data) {
    const { path, bounds, optimum } = data;
    const width = optimCanvas.width;
    const height = optimCanvas.height;
    const padding = 45;

    optimCtx.fillStyle = '#0a1418';
    optimCtx.fillRect(0, 0, width, height);

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    function mapX(x) { return padding + (x - bounds.xMin) / (bounds.xMax - bounds.xMin) * plotWidth; }
    function mapY(y) { return height - padding - (y - bounds.yMin) / (bounds.yMax - bounds.yMin) * plotHeight; }

    // Grid
    optimCtx.strokeStyle = '#152228';
    optimCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const x = padding + (i / 10) * plotWidth;
        const y = padding + (i / 10) * plotHeight;
        optimCtx.beginPath(); optimCtx.moveTo(x, padding); optimCtx.lineTo(x, height - padding); optimCtx.stroke();
        optimCtx.beginPath(); optimCtx.moveTo(padding, y); optimCtx.lineTo(width - padding, y); optimCtx.stroke();
    }

    // Axis labels
    optimCtx.fillStyle = '#5a7a8a';
    optimCtx.font = '10px monospace';
    optimCtx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
        const xVal = bounds.xMin + (i / 4) * (bounds.xMax - bounds.xMin);
        const yVal = bounds.yMin + (i / 4) * (bounds.yMax - bounds.yMin);
        optimCtx.fillText(xVal.toFixed(1), padding + (i / 4) * plotWidth, height - padding + 15);
        optimCtx.textAlign = 'right';
        optimCtx.fillText(yVal.toFixed(1), padding - 5, height - padding - (i / 4) * plotHeight + 3);
        optimCtx.textAlign = 'center';
    }

    // Optimum
    optimCtx.fillStyle = '#f59e0b';
    optimCtx.beginPath();
    optimCtx.arc(mapX(optimum[0]), mapY(optimum[1]), 10, 0, Math.PI * 2);
    optimCtx.fill();

    // Path
    if (path.length > 1) {
        for (let i = 1; i < path.length; i++) {
            const t = i / path.length;
            optimCtx.strokeStyle = `rgba(0, 212, 255, ${0.3 + t * 0.7})`;
            optimCtx.lineWidth = 2;
            optimCtx.beginPath();
            optimCtx.moveTo(mapX(path[i - 1][0]), mapY(path[i - 1][1]));
            optimCtx.lineTo(mapX(path[i][0]), mapY(path[i][1]));
            optimCtx.stroke();
        }

        // Points (sparse for performance)
        const step = Math.max(1, Math.floor(path.length / 50));
        for (let i = 0; i < path.length; i += step) {
            optimCtx.fillStyle = `rgba(125, 211, 252, ${0.4 + (i / path.length) * 0.6})`;
            optimCtx.beginPath();
            optimCtx.arc(mapX(path[i][0]), mapY(path[i][1]), 3, 0, Math.PI * 2);
            optimCtx.fill();
        }

        // Start
        optimCtx.fillStyle = '#ef4444';
        optimCtx.beginPath();
        optimCtx.arc(mapX(path[0][0]), mapY(path[0][1]), 7, 0, Math.PI * 2);
        optimCtx.fill();

        // End
        optimCtx.fillStyle = '#00d4ff';
        optimCtx.beginPath();
        optimCtx.arc(mapX(path[path.length - 1][0]), mapY(path[path.length - 1][1]), 7, 0, Math.PI * 2);
        optimCtx.fill();
    }

    // Border
    optimCtx.strokeStyle = '#2a4a5a';
    optimCtx.lineWidth = 2;
    optimCtx.strokeRect(padding, padding, plotWidth, plotHeight);
}

function drawLossHistory(lossHistory) {
    const width = lossCanvas.width;
    const height = lossCanvas.height;
    const padding = 50;

    lossCtx.fillStyle = '#0a1418';
    lossCtx.fillRect(0, 0, width, height);

    if (lossHistory.length < 2) return;

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    const logLoss = lossHistory.map(l => Math.log10(Math.max(l, 1e-15)));
    const minLog = Math.min(...logLoss);
    const maxLog = Math.max(...logLoss);
    const logRange = maxLog - minLog || 1;

    // Grid
    lossCtx.strokeStyle = '#152228';
    lossCtx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * plotHeight;
        lossCtx.beginPath(); lossCtx.moveTo(padding, y); lossCtx.lineTo(width - padding, y); lossCtx.stroke();
    }

    // Curve
    lossCtx.strokeStyle = '#00d4ff';
    lossCtx.lineWidth = 2;
    lossCtx.beginPath();
    for (let i = 0; i < logLoss.length; i++) {
        const x = padding + (i / (logLoss.length - 1)) * plotWidth;
        const y = height - padding - ((logLoss[i] - minLog) / logRange) * plotHeight;
        if (i === 0) lossCtx.moveTo(x, y);
        else lossCtx.lineTo(x, y);
    }
    lossCtx.stroke();

    // Labels
    lossCtx.fillStyle = '#5a7a8a';
    lossCtx.font = '10px monospace';
    lossCtx.textAlign = 'center';
    lossCtx.fillText('Iteration', width / 2, height - 5);

    lossCtx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * plotHeight;
        const val = maxLog - (i / 5) * logRange;
        lossCtx.fillText('1e' + val.toFixed(0), padding - 5, y + 3);
    }
}

function resetUI() {
    optimizeBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
}

function startOptimization() {
    const params = {
        functionName: functionSelect.value,
        memorySize: parseInt(memorySizeInput.value),
        maxIter: parseInt(maxIterInput.value),
        tolerance: parseFloat(toleranceInput.value),
        initialStep: parseFloat(initialStepInput.value)
    };

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    optimizeBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');

    initWorker();
    worker.postMessage({ params });
}

function stopOptimization() {
    if (worker) { worker.terminate(); worker = null; }
    resetUI();
    progressContainer.classList.add('hidden');
}

function reset() {
    stopOptimization();
    resultContainer.classList.add('hidden');
    optimCtx.fillStyle = '#0a1418';
    optimCtx.fillRect(0, 0, optimCanvas.width, optimCanvas.height);
    optimCtx.fillStyle = '#5a7a8a';
    optimCtx.font = '14px sans-serif';
    optimCtx.textAlign = 'center';
    optimCtx.fillText('Click "Start L-BFGS" to begin', optimCanvas.width / 2, optimCanvas.height / 2);
    lossCtx.fillStyle = '#0a1418';
    lossCtx.fillRect(0, 0, lossCanvas.width, lossCanvas.height);
}

optimizeBtn.addEventListener('click', startOptimization);
stopBtn.addEventListener('click', stopOptimization);
resetBtn.addEventListener('click', reset);

reset();
