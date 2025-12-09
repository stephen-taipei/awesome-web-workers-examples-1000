// Newton's Method Optimization - Main Thread

const functionSelect = document.getElementById('functionSelect');
const maxIterInput = document.getElementById('maxIter');
const toleranceInput = document.getElementById('tolerance');
const stepSizeInput = document.getElementById('stepSize');
const useLineSearchInput = document.getElementById('useLineSearch');

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
const gradNorm = document.getElementById('gradNorm');

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
        if (data.type === 'progress') {
            updateProgress(data);
        } else if (data.type === 'result') {
            showResult(data);
        } else if (data.type === 'error') {
            alert(data.message);
            resetUI();
        }
    };
}

function updateProgress(data) {
    progressContainer.classList.remove('hidden');
    progressBar.style.width = data.percent + '%';
    progressText.textContent = `Iteration ${data.iteration} - Loss: ${data.currentLoss.toExponential(4)} - |∇f|: ${data.gradNorm.toExponential(2)}`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    iterCount.textContent = data.iterations + (data.converged ? ' (converged)' : '');
    finalPos.textContent = `(${data.finalPosition[0].toFixed(6)}, ${data.finalPosition[1].toFixed(6)})`;
    finalValue.textContent = data.finalValue.toExponential(6);
    gradNorm.textContent = data.finalGradNorm.toExponential(4);

    drawPath(data);
    drawLossHistory(data.lossHistory);
    resetUI();
}

function drawPath(data) {
    const { path, bounds, optimum } = data;
    const width = optimCanvas.width;
    const height = optimCanvas.height;
    const padding = 45;

    optimCtx.fillStyle = '#0f0f1a';
    optimCtx.fillRect(0, 0, width, height);

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    function mapX(x) {
        return padding + (x - bounds.xMin) / (bounds.xMax - bounds.xMin) * plotWidth;
    }
    function mapY(y) {
        return height - padding - (y - bounds.yMin) / (bounds.yMax - bounds.yMin) * plotHeight;
    }

    // Grid
    optimCtx.strokeStyle = '#1a1a2e';
    optimCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const x = padding + (i / 10) * plotWidth;
        const y = padding + (i / 10) * plotHeight;
        optimCtx.beginPath();
        optimCtx.moveTo(x, padding);
        optimCtx.lineTo(x, height - padding);
        optimCtx.stroke();
        optimCtx.beginPath();
        optimCtx.moveTo(padding, y);
        optimCtx.lineTo(width - padding, y);
        optimCtx.stroke();
    }

    // Axis labels
    optimCtx.fillStyle = '#6b7280';
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
    optimCtx.fillStyle = '#22c55e';
    optimCtx.beginPath();
    optimCtx.arc(mapX(optimum[0]), mapY(optimum[1]), 10, 0, Math.PI * 2);
    optimCtx.fill();

    // Path with gradient color
    if (path.length > 1) {
        for (let i = 1; i < path.length; i++) {
            const t = i / path.length;
            optimCtx.strokeStyle = `rgba(168, 85, 247, ${0.3 + t * 0.7})`;
            optimCtx.lineWidth = 2;
            optimCtx.beginPath();
            optimCtx.moveTo(mapX(path[i - 1][0]), mapY(path[i - 1][1]));
            optimCtx.lineTo(mapX(path[i][0]), mapY(path[i][1]));
            optimCtx.stroke();
        }

        // Draw points
        for (let i = 0; i < path.length; i++) {
            const t = i / path.length;
            optimCtx.fillStyle = `rgba(236, 72, 153, ${0.4 + t * 0.6})`;
            optimCtx.beginPath();
            optimCtx.arc(mapX(path[i][0]), mapY(path[i][1]), 4, 0, Math.PI * 2);
            optimCtx.fill();
        }

        // Start
        optimCtx.fillStyle = '#ef4444';
        optimCtx.beginPath();
        optimCtx.arc(mapX(path[0][0]), mapY(path[0][1]), 7, 0, Math.PI * 2);
        optimCtx.fill();

        // End
        optimCtx.fillStyle = '#a855f7';
        optimCtx.beginPath();
        optimCtx.arc(mapX(path[path.length - 1][0]), mapY(path[path.length - 1][1]), 7, 0, Math.PI * 2);
        optimCtx.fill();
    }

    // Border
    optimCtx.strokeStyle = '#374151';
    optimCtx.lineWidth = 2;
    optimCtx.strokeRect(padding, padding, plotWidth, plotHeight);

    // Legend
    optimCtx.font = '11px sans-serif';
    optimCtx.textAlign = 'left';
    optimCtx.fillStyle = '#ef4444';
    optimCtx.fillRect(padding + 10, 12, 12, 12);
    optimCtx.fillStyle = '#9ca3af';
    optimCtx.fillText('Start', padding + 28, 22);

    optimCtx.fillStyle = '#a855f7';
    optimCtx.fillRect(padding + 75, 12, 12, 12);
    optimCtx.fillStyle = '#9ca3af';
    optimCtx.fillText('End', padding + 93, 22);

    optimCtx.fillStyle = '#22c55e';
    optimCtx.fillRect(padding + 130, 12, 12, 12);
    optimCtx.fillStyle = '#9ca3af';
    optimCtx.fillText('Optimum', padding + 148, 22);
}

function drawLossHistory(lossHistory) {
    const width = lossCanvas.width;
    const height = lossCanvas.height;
    const padding = 50;

    lossCtx.fillStyle = '#0f0f1a';
    lossCtx.fillRect(0, 0, width, height);

    if (lossHistory.length < 2) return;

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    const logLoss = lossHistory.map(l => Math.log10(Math.max(l, 1e-15)));
    const minLog = Math.min(...logLoss);
    const maxLog = Math.max(...logLoss);
    const logRange = maxLog - minLog || 1;

    // Grid
    lossCtx.strokeStyle = '#1a1a2e';
    lossCtx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * plotHeight;
        lossCtx.beginPath();
        lossCtx.moveTo(padding, y);
        lossCtx.lineTo(width - padding, y);
        lossCtx.stroke();
    }

    // Loss curve
    lossCtx.strokeStyle = '#a855f7';
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
    lossCtx.fillStyle = '#6b7280';
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
        maxIter: parseInt(maxIterInput.value),
        tolerance: parseFloat(toleranceInput.value),
        stepSize: parseFloat(stepSizeInput.value),
        useLineSearch: useLineSearchInput.checked
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
    if (worker) {
        worker.terminate();
        worker = null;
    }
    resetUI();
    progressContainer.classList.add('hidden');
}

function reset() {
    stopOptimization();
    resultContainer.classList.add('hidden');
    optimCtx.fillStyle = '#0f0f1a';
    optimCtx.fillRect(0, 0, optimCanvas.width, optimCanvas.height);
    optimCtx.fillStyle = '#4b5563';
    optimCtx.font = '14px sans-serif';
    optimCtx.textAlign = 'center';
    optimCtx.fillText('Click "Start Optimization" to begin', optimCanvas.width / 2, optimCanvas.height / 2);
    lossCtx.fillStyle = '#0f0f1a';
    lossCtx.fillRect(0, 0, lossCanvas.width, lossCanvas.height);
}

optimizeBtn.addEventListener('click', startOptimization);
stopBtn.addEventListener('click', stopOptimization);
resetBtn.addEventListener('click', reset);

// Initial state
reset();
