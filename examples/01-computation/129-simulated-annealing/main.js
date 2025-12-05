// Simulated Annealing - Main Thread

const functionSelect = document.getElementById('functionSelect');
const coolingSchedule = document.getElementById('coolingSchedule');
const initialTempInput = document.getElementById('initialTemp');
const minTempInput = document.getElementById('minTemp');
const coolingRateInput = document.getElementById('coolingRate');
const maxIterInput = document.getElementById('maxIter');
const stepSizeInput = document.getElementById('stepSize');

const optimizeBtn = document.getElementById('optimizeBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const iterCount = document.getElementById('iterCount');
const bestPos = document.getElementById('bestPos');
const bestValue = document.getElementById('bestValue');
const acceptRate = document.getElementById('acceptRate');

const optimCanvas = document.getElementById('optimCanvas');
const energyCanvas = document.getElementById('energyCanvas');
const tempCanvas = document.getElementById('tempCanvas');
const optimCtx = optimCanvas.getContext('2d');
const energyCtx = energyCanvas.getContext('2d');
const tempCtx = tempCanvas.getContext('2d');

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
    progressText.textContent = `Iter ${data.iteration} | T: ${data.temperature.toExponential(2)} | Best: ${data.bestEnergy.toExponential(4)} | Accept: ${data.acceptRate}%`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    iterCount.textContent = data.iterations;
    bestPos.textContent = `(${data.bestPosition[0].toFixed(6)}, ${data.bestPosition[1].toFixed(6)})`;
    bestValue.textContent = data.bestValue.toExponential(6);
    acceptRate.textContent = data.acceptanceRate + '%';
    drawPath(data);
    drawEnergyHistory(data);
    drawTempHistory(data);
    resetUI();
}

function drawPath(data) {
    const { path, bounds, optimum } = data;
    const w = optimCanvas.width, h = optimCanvas.height, p = 45;
    optimCtx.fillStyle = '#0f0a14'; optimCtx.fillRect(0, 0, w, h);
    const pw = w - p * 2, ph = h - p * 2;
    const mapX = x => p + (x - bounds.xMin) / (bounds.xMax - bounds.xMin) * pw;
    const mapY = y => h - p - (y - bounds.yMin) / (bounds.yMax - bounds.yMin) * ph;

    // Grid
    optimCtx.strokeStyle = '#1a1420'; optimCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        optimCtx.beginPath(); optimCtx.moveTo(p + i / 10 * pw, p); optimCtx.lineTo(p + i / 10 * pw, h - p); optimCtx.stroke();
        optimCtx.beginPath(); optimCtx.moveTo(p, p + i / 10 * ph); optimCtx.lineTo(w - p, p + i / 10 * ph); optimCtx.stroke();
    }

    // Labels
    optimCtx.fillStyle = '#6a5a4a'; optimCtx.font = '10px monospace'; optimCtx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
        optimCtx.fillText((bounds.xMin + i / 4 * (bounds.xMax - bounds.xMin)).toFixed(1), p + i / 4 * pw, h - p + 15);
        optimCtx.textAlign = 'right';
        optimCtx.fillText((bounds.yMin + i / 4 * (bounds.yMax - bounds.yMin)).toFixed(1), p - 5, h - p - i / 4 * ph + 3);
        optimCtx.textAlign = 'center';
    }

    // Optimum
    optimCtx.fillStyle = '#22c55e'; optimCtx.beginPath(); optimCtx.arc(mapX(optimum[0]), mapY(optimum[1]), 10, 0, Math.PI * 2); optimCtx.fill();

    // Path with temperature-based coloring
    if (path.length > 1) {
        for (let i = 1; i < path.length; i++) {
            const t = i / path.length;
            // Color from hot (red/orange) to cold (blue)
            const r = Math.round(255 * (1 - t));
            const g = Math.round(100 * (1 - t));
            const b = Math.round(255 * t);
            optimCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + t * 0.5})`;
            optimCtx.lineWidth = 1.5;
            optimCtx.beginPath();
            optimCtx.moveTo(mapX(path[i - 1][0]), mapY(path[i - 1][1]));
            optimCtx.lineTo(mapX(path[i][0]), mapY(path[i][1]));
            optimCtx.stroke();
        }
        // Start point (hot - red)
        optimCtx.fillStyle = '#ff4444';
        optimCtx.beginPath();
        optimCtx.arc(mapX(path[0][0]), mapY(path[0][1]), 7, 0, Math.PI * 2);
        optimCtx.fill();
        // End point (cold - blue)
        optimCtx.fillStyle = '#44aaff';
        optimCtx.beginPath();
        optimCtx.arc(mapX(path[path.length - 1][0]), mapY(path[path.length - 1][1]), 7, 0, Math.PI * 2);
        optimCtx.fill();
    }
    optimCtx.strokeStyle = '#3a2a1a'; optimCtx.lineWidth = 2; optimCtx.strokeRect(p, p, pw, ph);
}

function drawEnergyHistory(data) {
    const { energyHistory, bestHistory } = data;
    const w = energyCanvas.width, h = energyCanvas.height, p = 35;
    energyCtx.fillStyle = '#0f0a14'; energyCtx.fillRect(0, 0, w, h);
    if (energyHistory.length < 2) return;

    const pw = w - p * 2, ph = h - p - 20;
    const logEnergy = energyHistory.map(e => Math.log10(Math.max(Math.abs(e) + 1, 1)));
    const logBest = bestHistory.map(e => Math.log10(Math.max(Math.abs(e) + 1, 1)));
    const allLog = [...logEnergy, ...logBest];
    const minLog = Math.min(...allLog), maxLog = Math.max(...allLog);
    const range = maxLog - minLog || 1;

    // Grid
    energyCtx.strokeStyle = '#1a1420'; energyCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        energyCtx.beginPath(); energyCtx.moveTo(p, 10 + i / 4 * ph); energyCtx.lineTo(w - 10, 10 + i / 4 * ph); energyCtx.stroke();
    }

    // Current energy line
    energyCtx.strokeStyle = '#ff6b35'; energyCtx.lineWidth = 1; energyCtx.beginPath();
    for (let i = 0; i < logEnergy.length; i++) {
        const x = p + i / (logEnergy.length - 1) * pw;
        const y = h - p - ((logEnergy[i] - minLog) / range) * ph;
        i === 0 ? energyCtx.moveTo(x, y) : energyCtx.lineTo(x, y);
    }
    energyCtx.stroke();

    // Best energy line
    energyCtx.strokeStyle = '#22c55e'; energyCtx.lineWidth = 2; energyCtx.beginPath();
    for (let i = 0; i < logBest.length; i++) {
        const x = p + i / (logBest.length - 1) * pw;
        const y = h - p - ((logBest[i] - minLog) / range) * ph;
        i === 0 ? energyCtx.moveTo(x, y) : energyCtx.lineTo(x, y);
    }
    energyCtx.stroke();

    // Legend
    energyCtx.fillStyle = '#ff6b35'; energyCtx.font = '9px sans-serif';
    energyCtx.fillText('Current', p + 5, 18);
    energyCtx.fillStyle = '#22c55e';
    energyCtx.fillText('Best', p + 55, 18);
}

function drawTempHistory(data) {
    const { tempHistory } = data;
    const w = tempCanvas.width, h = tempCanvas.height, p = 35;
    tempCtx.fillStyle = '#0f0a14'; tempCtx.fillRect(0, 0, w, h);
    if (tempHistory.length < 2) return;

    const pw = w - p * 2, ph = h - p - 20;
    const logTemp = tempHistory.map(t => Math.log10(Math.max(t, 1e-10)));
    const minLog = Math.min(...logTemp), maxLog = Math.max(...logTemp);
    const range = maxLog - minLog || 1;

    // Grid
    tempCtx.strokeStyle = '#1a1420'; tempCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        tempCtx.beginPath(); tempCtx.moveTo(p, 10 + i / 4 * ph); tempCtx.lineTo(w - 10, 10 + i / 4 * ph); tempCtx.stroke();
    }

    // Temperature curve - gradient from hot to cold
    for (let i = 1; i < logTemp.length; i++) {
        const t = i / logTemp.length;
        const r = Math.round(255 * (1 - t));
        const b = Math.round(255 * t);
        tempCtx.strokeStyle = `rgb(${r}, 50, ${b})`;
        tempCtx.lineWidth = 2;
        tempCtx.beginPath();
        const x1 = p + (i - 1) / (logTemp.length - 1) * pw;
        const y1 = h - p - ((logTemp[i - 1] - minLog) / range) * ph;
        const x2 = p + i / (logTemp.length - 1) * pw;
        const y2 = h - p - ((logTemp[i] - minLog) / range) * ph;
        tempCtx.moveTo(x1, y1);
        tempCtx.lineTo(x2, y2);
        tempCtx.stroke();
    }

    // Labels
    tempCtx.fillStyle = '#6a5a4a'; tempCtx.font = '9px monospace'; tempCtx.textAlign = 'right';
    tempCtx.fillText('1e' + maxLog.toFixed(0), p - 3, 15);
    tempCtx.fillText('1e' + minLog.toFixed(0), p - 3, h - p + 3);
}

function resetUI() { optimizeBtn.classList.remove('hidden'); stopBtn.classList.add('hidden'); }

function startOptimization() {
    const params = {
        functionName: functionSelect.value,
        coolingSchedule: coolingSchedule.value,
        initialTemp: parseFloat(initialTempInput.value),
        minTemp: parseFloat(minTempInput.value),
        coolingRate: parseFloat(coolingRateInput.value),
        maxIter: parseInt(maxIterInput.value),
        stepSize: parseFloat(stepSizeInput.value)
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
    optimCtx.fillStyle = '#0f0a14'; optimCtx.fillRect(0, 0, optimCanvas.width, optimCanvas.height);
    optimCtx.fillStyle = '#6a5a4a'; optimCtx.font = '14px sans-serif'; optimCtx.textAlign = 'center';
    optimCtx.fillText('Click "Start SA" to begin', optimCanvas.width / 2, optimCanvas.height / 2);
    energyCtx.fillStyle = '#0f0a14'; energyCtx.fillRect(0, 0, energyCanvas.width, energyCanvas.height);
    tempCtx.fillStyle = '#0f0a14'; tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
}

optimizeBtn.addEventListener('click', startOptimization);
stopBtn.addEventListener('click', stopOptimization);
resetBtn.addEventListener('click', reset);
reset();
