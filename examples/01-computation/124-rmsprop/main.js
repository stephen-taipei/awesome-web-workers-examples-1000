// RMSprop Optimizer - Main Thread

const functionSelect = document.getElementById('functionSelect');
const learningRateInput = document.getElementById('learningRate');
const decayRateInput = document.getElementById('decayRate');
const epsilonInput = document.getElementById('epsilon');
const maxIterInput = document.getElementById('maxIter');
const toleranceInput = document.getElementById('tolerance');
const useMomentumInput = document.getElementById('useMomentum');

const optimizeBtn = document.getElementById('optimizeBtn');
const stopBtn = document.getElementById('stopBtn');
const compareBtn = document.getElementById('compareBtn');

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
let comparisonData = null;

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
            case 'comparison':
                showComparison(data);
                break;
            case 'error':
                alert(data.message);
                resetUI();
                break;
        }
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
    finalPos.textContent = `(${data.finalPosition[0].toFixed(4)}, ${data.finalPosition[1].toFixed(4)})`;
    finalValue.textContent = data.finalValue.toExponential(4);
    execTime.textContent = data.executionTime.toFixed(1) + ' ms';

    comparisonData = null;
    drawOptimizationPath(data.path, data.bounds, data.optimum);
    drawLossHistory([{ data: data.lossHistory, color: '#ffd93d', label: 'RMSprop' }]);

    resetUI();
}

function showComparison(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    comparisonData = data;

    iterCount.textContent = `RMSprop: ${data.rmsprop.lossHistory.length} / SGD: ${data.sgd.lossHistory.length}`;
    finalPos.textContent = `(${data.rmsprop.finalPosition[0].toFixed(4)}, ${data.rmsprop.finalPosition[1].toFixed(4)})`;
    finalValue.textContent = `RMSprop: ${data.rmsprop.finalValue.toExponential(2)} / SGD: ${data.sgd.finalValue.toExponential(2)}`;
    execTime.textContent = '-';

    // Draw both paths
    drawComparisonPaths(data);
    drawLossHistory([
        { data: data.rmsprop.lossHistory, color: '#ffd93d', label: 'RMSprop' },
        { data: data.sgd.lossHistory, color: '#e74c3c', label: 'SGD' }
    ]);

    resetUI();
}

function drawOptimizationPath(path, bounds, optimum) {
    const width = optimCanvas.width;
    const height = optimCanvas.height;
    const padding = 45;

    optimCtx.fillStyle = '#0d1421';
    optimCtx.fillRect(0, 0, width, height);

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    function mapX(x) {
        return padding + (x - bounds.xMin) / (bounds.xMax - bounds.xMin) * plotWidth;
    }

    function mapY(y) {
        return height - padding - (y - bounds.yMin) / (bounds.yMax - bounds.yMin) * plotHeight;
    }

    // Draw grid
    optimCtx.strokeStyle = '#1a2535';
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

    // Axes labels
    optimCtx.fillStyle = '#5a6a7a';
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

    // Draw optimum
    optimCtx.fillStyle = '#6ee7b7';
    optimCtx.beginPath();
    optimCtx.arc(mapX(optimum[0]), mapY(optimum[1]), 10, 0, Math.PI * 2);
    optimCtx.fill();

    // Draw path
    if (path.length > 1) {
        optimCtx.lineWidth = 2;

        for (let i = 1; i < path.length; i++) {
            const alpha = 0.3 + (i / path.length) * 0.7;
            optimCtx.strokeStyle = `rgba(255, 217, 61, ${alpha})`;
            optimCtx.beginPath();
            optimCtx.moveTo(mapX(path[i - 1][0]), mapY(path[i - 1][1]));
            optimCtx.lineTo(mapX(path[i][0]), mapY(path[i][1]));
            optimCtx.stroke();
        }

        // Start point
        optimCtx.fillStyle = '#e74c3c';
        optimCtx.beginPath();
        optimCtx.arc(mapX(path[0][0]), mapY(path[0][1]), 7, 0, Math.PI * 2);
        optimCtx.fill();

        // End point
        optimCtx.fillStyle = '#ffd93d';
        optimCtx.beginPath();
        optimCtx.arc(mapX(path[path.length - 1][0]), mapY(path[path.length - 1][1]), 7, 0, Math.PI * 2);
        optimCtx.fill();
    }

    // Border
    optimCtx.strokeStyle = '#2a3a4a';
    optimCtx.lineWidth = 2;
    optimCtx.strokeRect(padding, padding, plotWidth, plotHeight);
}

function drawComparisonPaths(data) {
    const { rmsprop, sgd, bounds, optimum } = data;
    const width = optimCanvas.width;
    const height = optimCanvas.height;
    const padding = 45;

    optimCtx.fillStyle = '#0d1421';
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
    optimCtx.strokeStyle = '#1a2535';
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

    // Optimum
    optimCtx.fillStyle = '#6ee7b7';
    optimCtx.beginPath();
    optimCtx.arc(mapX(optimum[0]), mapY(optimum[1]), 10, 0, Math.PI * 2);
    optimCtx.fill();

    // Draw SGD path (red)
    drawPath(sgd.path, '#e74c3c', 0.6);

    // Draw RMSprop path (yellow)
    drawPath(rmsprop.path, '#ffd93d', 1);

    function drawPath(path, color, alpha) {
        if (path.length < 2) return;

        optimCtx.strokeStyle = color;
        optimCtx.globalAlpha = alpha;
        optimCtx.lineWidth = 2;
        optimCtx.beginPath();

        for (let i = 0; i < path.length; i++) {
            const px = mapX(path[i][0]);
            const py = mapY(path[i][1]);

            if (i === 0) {
                optimCtx.moveTo(px, py);
            } else {
                optimCtx.lineTo(px, py);
            }
        }
        optimCtx.stroke();
        optimCtx.globalAlpha = 1;
    }

    // Start point
    optimCtx.fillStyle = '#ffffff';
    optimCtx.beginPath();
    optimCtx.arc(mapX(rmsprop.path[0][0]), mapY(rmsprop.path[0][1]), 6, 0, Math.PI * 2);
    optimCtx.fill();

    // Border
    optimCtx.strokeStyle = '#2a3a4a';
    optimCtx.lineWidth = 2;
    optimCtx.strokeRect(padding, padding, plotWidth, plotHeight);

    // Legend
    optimCtx.font = '11px sans-serif';
    optimCtx.textAlign = 'left';

    optimCtx.fillStyle = '#ffd93d';
    optimCtx.fillRect(padding + 10, 15, 15, 10);
    optimCtx.fillStyle = '#aaa';
    optimCtx.fillText('RMSprop', padding + 30, 24);

    optimCtx.fillStyle = '#e74c3c';
    optimCtx.fillRect(padding + 100, 15, 15, 10);
    optimCtx.fillStyle = '#aaa';
    optimCtx.fillText('SGD', padding + 120, 24);
}

function drawLossHistory(datasets) {
    const width = lossCanvas.width;
    const height = lossCanvas.height;
    const padding = 50;

    lossCtx.fillStyle = '#0d1421';
    lossCtx.fillRect(0, 0, width, height);

    if (!datasets.length || !datasets[0].data.length) return;

    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    // Find global min/max for log scale
    let allLogs = [];
    datasets.forEach(ds => {
        ds.data.forEach(l => {
            if (l > 0) allLogs.push(Math.log10(l));
        });
    });

    const minLog = Math.min(...allLogs);
    const maxLog = Math.max(...allLogs);
    const logRange = maxLog - minLog || 1;

    const maxLen = Math.max(...datasets.map(ds => ds.data.length));

    // Grid
    lossCtx.strokeStyle = '#1a2535';
    lossCtx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * plotHeight;
        lossCtx.beginPath();
        lossCtx.moveTo(padding, y);
        lossCtx.lineTo(width - padding, y);
        lossCtx.stroke();
    }

    // Draw each dataset
    datasets.forEach(ds => {
        lossCtx.strokeStyle = ds.color;
        lossCtx.lineWidth = 2;
        lossCtx.beginPath();

        for (let i = 0; i < ds.data.length; i++) {
            const x = padding + (i / (maxLen - 1)) * plotWidth;
            const logVal = ds.data[i] > 0 ? Math.log10(ds.data[i]) : minLog;
            const y = height - padding - ((logVal - minLog) / logRange) * plotHeight;

            if (i === 0) {
                lossCtx.moveTo(x, y);
            } else {
                lossCtx.lineTo(x, y);
            }
        }
        lossCtx.stroke();
    });

    // Labels
    lossCtx.fillStyle = '#5a6a7a';
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
        learningRate: parseFloat(learningRateInput.value),
        decayRate: parseFloat(decayRateInput.value),
        epsilon: parseFloat(epsilonInput.value),
        maxIter: parseInt(maxIterInput.value),
        tolerance: parseFloat(toleranceInput.value),
        useMomentum: useMomentumInput.checked
    };

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    optimizeBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');

    initWorker();
    worker.postMessage({ type: 'optimize', params });
}

function startComparison() {
    const params = {
        functionName: functionSelect.value,
        learningRate: parseFloat(learningRateInput.value),
        decayRate: parseFloat(decayRateInput.value),
        epsilon: parseFloat(epsilonInput.value),
        maxIter: parseInt(maxIterInput.value),
        tolerance: parseFloat(toleranceInput.value)
    };

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressText.textContent = 'Running comparison...';

    initWorker();
    worker.postMessage({ type: 'compare', params });
}

function stopOptimization() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    resetUI();
    progressContainer.classList.add('hidden');
}

// Event listeners
optimizeBtn.addEventListener('click', startOptimization);
stopBtn.addEventListener('click', stopOptimization);
compareBtn.addEventListener('click', startComparison);

// Initial canvas state
optimCtx.fillStyle = '#0d1421';
optimCtx.fillRect(0, 0, optimCanvas.width, optimCanvas.height);
optimCtx.fillStyle = '#3a4a5a';
optimCtx.font = '14px sans-serif';
optimCtx.textAlign = 'center';
optimCtx.fillText('Click "Start Optimization" to begin', optimCanvas.width / 2, optimCanvas.height / 2);

lossCtx.fillStyle = '#0d1421';
lossCtx.fillRect(0, 0, lossCanvas.width, lossCanvas.height);
