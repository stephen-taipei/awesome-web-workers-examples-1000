// Adam Optimizer - Main Thread

const functionSelect = document.getElementById('functionSelect');
const learningRateInput = document.getElementById('learningRate');
const beta1Input = document.getElementById('beta1');
const beta2Input = document.getElementById('beta2');
const epsilonInput = document.getElementById('epsilon');
const maxIterInput = document.getElementById('maxIter');
const toleranceInput = document.getElementById('tolerance');

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
const execTime = document.getElementById('execTime');

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

        switch (data.type) {
            case 'progress':
                updateProgress(data);
                break;
            case 'result':
                showResult(data);
                break;
            case 'error':
                alert(data.message);
                resetUI();
                break;
        }
    };

    worker.onerror = function(e) {
        alert('Worker error: ' + e.message);
        resetUI();
    };
}

function updateProgress(data) {
    progressContainer.classList.remove('hidden');
    progressBar.style.width = data.percent + '%';
    progressText.textContent = `Iteration ${data.iteration}/${data.maxIter} - Loss: ${data.currentLoss.toExponential(4)}`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    iterCount.textContent = data.iterations + (data.converged ? ' (converged)' : '');
    finalPos.textContent = `(${data.finalPosition[0].toFixed(6)}, ${data.finalPosition[1].toFixed(6)})`;
    finalValue.textContent = data.finalValue.toExponential(6);
    execTime.textContent = data.executionTime.toFixed(2) + ' ms';

    drawOptimizationPath(data);
    drawLossHistory(data.lossHistory);

    resetUI();
}

function drawOptimizationPath(data) {
    const { path, bounds, optimum } = data;
    const width = optimCanvas.width;
    const height = optimCanvas.height;
    const padding = 40;

    // Clear canvas
    optimCtx.fillStyle = '#0a0a0a';
    optimCtx.fillRect(0, 0, width, height);

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    // Map coordinates
    function mapX(x) {
        return padding + (x - bounds.xMin) / (bounds.xMax - bounds.xMin) * plotWidth;
    }

    function mapY(y) {
        return height - padding - (y - bounds.yMin) / (bounds.yMax - bounds.yMin) * plotHeight;
    }

    // Draw grid
    optimCtx.strokeStyle = '#222';
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

    // Draw axes labels
    optimCtx.fillStyle = '#666';
    optimCtx.font = '10px monospace';
    optimCtx.textAlign = 'center';

    for (let i = 0; i <= 4; i++) {
        const xVal = bounds.xMin + (i / 4) * (bounds.xMax - bounds.xMin);
        const yVal = bounds.yMin + (i / 4) * (bounds.yMax - bounds.yMin);
        const x = padding + (i / 4) * plotWidth;
        const y = height - padding - (i / 4) * plotHeight;

        optimCtx.fillText(xVal.toFixed(1), x, height - padding + 15);
        optimCtx.textAlign = 'right';
        optimCtx.fillText(yVal.toFixed(1), padding - 5, y + 3);
        optimCtx.textAlign = 'center';
    }

    // Draw optimum point
    optimCtx.fillStyle = '#00ff00';
    optimCtx.beginPath();
    optimCtx.arc(mapX(optimum[0]), mapY(optimum[1]), 8, 0, Math.PI * 2);
    optimCtx.fill();

    // Draw optimization path
    if (path.length > 1) {
        // Draw path line with gradient
        optimCtx.lineWidth = 2;

        for (let i = 1; i < path.length; i++) {
            const alpha = 0.3 + (i / path.length) * 0.7;
            optimCtx.strokeStyle = `rgba(0, 217, 255, ${alpha})`;
            optimCtx.beginPath();
            optimCtx.moveTo(mapX(path[i - 1][0]), mapY(path[i - 1][1]));
            optimCtx.lineTo(mapX(path[i][0]), mapY(path[i][1]));
            optimCtx.stroke();
        }

        // Draw points
        for (let i = 0; i < path.length; i += Math.max(1, Math.floor(path.length / 50))) {
            const alpha = 0.3 + (i / path.length) * 0.7;
            optimCtx.fillStyle = `rgba(255, 100, 100, ${alpha})`;
            optimCtx.beginPath();
            optimCtx.arc(mapX(path[i][0]), mapY(path[i][1]), 3, 0, Math.PI * 2);
            optimCtx.fill();
        }

        // Draw start point
        optimCtx.fillStyle = '#ff4757';
        optimCtx.beginPath();
        optimCtx.arc(mapX(path[0][0]), mapY(path[0][1]), 6, 0, Math.PI * 2);
        optimCtx.fill();

        // Draw end point
        optimCtx.fillStyle = '#00d9ff';
        optimCtx.beginPath();
        optimCtx.arc(mapX(path[path.length - 1][0]), mapY(path[path.length - 1][1]), 6, 0, Math.PI * 2);
        optimCtx.fill();
    }

    // Legend
    optimCtx.font = '11px sans-serif';
    optimCtx.textAlign = 'left';

    optimCtx.fillStyle = '#ff4757';
    optimCtx.fillRect(padding, 10, 12, 12);
    optimCtx.fillStyle = '#aaa';
    optimCtx.fillText('Start', padding + 18, 20);

    optimCtx.fillStyle = '#00d9ff';
    optimCtx.fillRect(padding + 60, 10, 12, 12);
    optimCtx.fillStyle = '#aaa';
    optimCtx.fillText('End', padding + 78, 20);

    optimCtx.fillStyle = '#00ff00';
    optimCtx.fillRect(padding + 120, 10, 12, 12);
    optimCtx.fillStyle = '#aaa';
    optimCtx.fillText('Optimum', padding + 138, 20);
}

function drawLossHistory(lossHistory) {
    const width = lossCanvas.width;
    const height = lossCanvas.height;
    const padding = 40;

    lossCtx.fillStyle = '#0a0a0a';
    lossCtx.fillRect(0, 0, width, height);

    if (lossHistory.length < 2) return;

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    // Use log scale for loss
    const logLoss = lossHistory.map(l => Math.log10(Math.max(l, 1e-10)));
    const minLog = Math.min(...logLoss);
    const maxLog = Math.max(...logLoss);
    const logRange = maxLog - minLog || 1;

    // Draw grid
    lossCtx.strokeStyle = '#222';
    lossCtx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * plotHeight;
        lossCtx.beginPath();
        lossCtx.moveTo(padding, y);
        lossCtx.lineTo(width - padding, y);
        lossCtx.stroke();
    }

    // Draw loss curve
    lossCtx.strokeStyle = '#7dffaf';
    lossCtx.lineWidth = 2;
    lossCtx.beginPath();

    for (let i = 0; i < logLoss.length; i++) {
        const x = padding + (i / (logLoss.length - 1)) * plotWidth;
        const y = height - padding - ((logLoss[i] - minLog) / logRange) * plotHeight;

        if (i === 0) {
            lossCtx.moveTo(x, y);
        } else {
            lossCtx.lineTo(x, y);
        }
    }
    lossCtx.stroke();

    // Labels
    lossCtx.fillStyle = '#666';
    lossCtx.font = '10px monospace';
    lossCtx.textAlign = 'center';
    lossCtx.fillText('Iteration', width / 2, height - 5);

    lossCtx.save();
    lossCtx.translate(12, height / 2);
    lossCtx.rotate(-Math.PI / 2);
    lossCtx.fillText('Log Loss', 0, 0);
    lossCtx.restore();

    // Y-axis values
    lossCtx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * plotHeight;
        const val = maxLog - (i / 5) * logRange;
        lossCtx.fillText(val.toFixed(1), padding - 5, y + 3);
    }
}

function resetUI() {
    optimizeBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
}

function startOptimization() {
    const params = {
        functionName: functionSelect.value,
        learningRate: parseFloat(learningRateInput.value),
        beta1: parseFloat(beta1Input.value),
        beta2: parseFloat(beta2Input.value),
        epsilon: parseFloat(epsilonInput.value),
        maxIter: parseInt(maxIterInput.value),
        tolerance: parseFloat(toleranceInput.value)
    };

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Initializing...';

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

    // Clear canvases
    optimCtx.fillStyle = '#0a0a0a';
    optimCtx.fillRect(0, 0, optimCanvas.width, optimCanvas.height);
    lossCtx.fillStyle = '#0a0a0a';
    lossCtx.fillRect(0, 0, lossCanvas.width, lossCanvas.height);

    // Reset inputs to defaults
    learningRateInput.value = '0.01';
    beta1Input.value = '0.9';
    beta2Input.value = '0.999';
    epsilonInput.value = '1e-8';
    maxIterInput.value = '1000';
    toleranceInput.value = '1e-6';
}

// Event listeners
optimizeBtn.addEventListener('click', startOptimization);
stopBtn.addEventListener('click', stopOptimization);
resetBtn.addEventListener('click', reset);

// Initial canvas state
optimCtx.fillStyle = '#0a0a0a';
optimCtx.fillRect(0, 0, optimCanvas.width, optimCanvas.height);
optimCtx.fillStyle = '#444';
optimCtx.font = '14px sans-serif';
optimCtx.textAlign = 'center';
optimCtx.fillText('Click "Start Optimization" to begin', optimCanvas.width / 2, optimCanvas.height / 2);

lossCtx.fillStyle = '#0a0a0a';
lossCtx.fillRect(0, 0, lossCanvas.width, lossCanvas.height);
