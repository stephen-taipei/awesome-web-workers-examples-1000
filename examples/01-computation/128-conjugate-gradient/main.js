// Conjugate Gradient - Main Thread
const functionSelect = document.getElementById('functionSelect');
const betaMethod = document.getElementById('betaMethod');
const maxIterInput = document.getElementById('maxIter');
const toleranceInput = document.getElementById('tolerance');
const restartFreqInput = document.getElementById('restartFreq');

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
const restarts = document.getElementById('restarts');

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
    progressText.textContent = `Iteration ${data.iteration} - Loss: ${data.currentLoss.toExponential(4)}`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    iterCount.textContent = data.iterations + (data.converged ? ' (converged)' : '');
    finalPos.textContent = `(${data.finalPosition[0].toFixed(6)}, ${data.finalPosition[1].toFixed(6)})`;
    finalValue.textContent = data.finalValue.toExponential(6);
    restarts.textContent = data.restartCount;
    drawPath(data);
    drawLoss(data.lossHistory);
    resetUI();
}

function drawPath(data) {
    const { path, bounds, optimum } = data;
    const w = optimCanvas.width, h = optimCanvas.height, p = 45;
    optimCtx.fillStyle = '#0f0f1a'; optimCtx.fillRect(0, 0, w, h);
    const pw = w - p * 2, ph = h - p * 2;
    const mapX = x => p + (x - bounds.xMin) / (bounds.xMax - bounds.xMin) * pw;
    const mapY = y => h - p - (y - bounds.yMin) / (bounds.yMax - bounds.yMin) * ph;

    // Grid
    optimCtx.strokeStyle = '#1a1a2e'; optimCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        optimCtx.beginPath(); optimCtx.moveTo(p + i / 10 * pw, p); optimCtx.lineTo(p + i / 10 * pw, h - p); optimCtx.stroke();
        optimCtx.beginPath(); optimCtx.moveTo(p, p + i / 10 * ph); optimCtx.lineTo(w - p, p + i / 10 * ph); optimCtx.stroke();
    }

    // Labels
    optimCtx.fillStyle = '#6b5a7a'; optimCtx.font = '10px monospace'; optimCtx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
        optimCtx.fillText((bounds.xMin + i / 4 * (bounds.xMax - bounds.xMin)).toFixed(1), p + i / 4 * pw, h - p + 15);
        optimCtx.textAlign = 'right';
        optimCtx.fillText((bounds.yMin + i / 4 * (bounds.yMax - bounds.yMin)).toFixed(1), p - 5, h - p - i / 4 * ph + 3);
        optimCtx.textAlign = 'center';
    }

    // Optimum
    optimCtx.fillStyle = '#22c55e'; optimCtx.beginPath(); optimCtx.arc(mapX(optimum[0]), mapY(optimum[1]), 10, 0, Math.PI * 2); optimCtx.fill();

    // Path
    if (path.length > 1) {
        for (let i = 1; i < path.length; i++) {
            optimCtx.strokeStyle = `rgba(244,114,182,${0.3 + (i / path.length) * 0.7})`;
            optimCtx.lineWidth = 2; optimCtx.beginPath();
            optimCtx.moveTo(mapX(path[i - 1][0]), mapY(path[i - 1][1]));
            optimCtx.lineTo(mapX(path[i][0]), mapY(path[i][1])); optimCtx.stroke();
        }
        optimCtx.fillStyle = '#ef4444'; optimCtx.beginPath(); optimCtx.arc(mapX(path[0][0]), mapY(path[0][1]), 7, 0, Math.PI * 2); optimCtx.fill();
        optimCtx.fillStyle = '#f472b6'; optimCtx.beginPath(); optimCtx.arc(mapX(path[path.length - 1][0]), mapY(path[path.length - 1][1]), 7, 0, Math.PI * 2); optimCtx.fill();
    }
    optimCtx.strokeStyle = '#3a2a4a'; optimCtx.lineWidth = 2; optimCtx.strokeRect(p, p, pw, ph);
}

function drawLoss(lossHistory) {
    const w = lossCanvas.width, h = lossCanvas.height, p = 50;
    lossCtx.fillStyle = '#0f0f1a'; lossCtx.fillRect(0, 0, w, h);
    if (lossHistory.length < 2) return;

    const pw = w - p * 2, ph = h - p * 2;
    const logLoss = lossHistory.map(l => Math.log10(Math.max(l, 1e-15)));
    const minLog = Math.min(...logLoss), maxLog = Math.max(...logLoss);
    const range = maxLog - minLog || 1;

    lossCtx.strokeStyle = '#1a1a2e'; lossCtx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) { lossCtx.beginPath(); lossCtx.moveTo(p, p + i / 5 * ph); lossCtx.lineTo(w - p, p + i / 5 * ph); lossCtx.stroke(); }

    lossCtx.strokeStyle = '#f472b6'; lossCtx.lineWidth = 2; lossCtx.beginPath();
    for (let i = 0; i < logLoss.length; i++) {
        const x = p + i / (logLoss.length - 1) * pw;
        const y = h - p - ((logLoss[i] - minLog) / range) * ph;
        i === 0 ? lossCtx.moveTo(x, y) : lossCtx.lineTo(x, y);
    }
    lossCtx.stroke();

    lossCtx.fillStyle = '#6b5a7a'; lossCtx.font = '10px monospace'; lossCtx.textAlign = 'center';
    lossCtx.fillText('Iteration', w / 2, h - 5);
    lossCtx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) lossCtx.fillText('1e' + (maxLog - i / 5 * range).toFixed(0), p - 5, p + i / 5 * ph + 3);
}

function resetUI() { optimizeBtn.classList.remove('hidden'); stopBtn.classList.add('hidden'); }

function startOptimization() {
    const params = {
        functionName: functionSelect.value,
        betaMethod: betaMethod.value,
        maxIter: parseInt(maxIterInput.value),
        tolerance: parseFloat(toleranceInput.value),
        restartFreq: parseInt(restartFreqInput.value)
    };
    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    optimizeBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    initWorker();
    worker.postMessage({ params });
}

function stopOptimization() { if (worker) { worker.terminate(); worker = null; } resetUI(); progressContainer.classList.add('hidden'); }

function reset() {
    stopOptimization(); resultContainer.classList.add('hidden');
    optimCtx.fillStyle = '#0f0f1a'; optimCtx.fillRect(0, 0, optimCanvas.width, optimCanvas.height);
    optimCtx.fillStyle = '#6b5a7a'; optimCtx.font = '14px sans-serif'; optimCtx.textAlign = 'center';
    optimCtx.fillText('Click "Start CG" to begin', optimCanvas.width / 2, optimCanvas.height / 2);
    lossCtx.fillStyle = '#0f0f1a'; lossCtx.fillRect(0, 0, lossCanvas.width, lossCanvas.height);
}

optimizeBtn.addEventListener('click', startOptimization);
stopBtn.addEventListener('click', stopOptimization);
resetBtn.addEventListener('click', reset);
reset();
