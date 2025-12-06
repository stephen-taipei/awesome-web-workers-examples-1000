// Artificial Bee Colony - Main Thread

const functionSelect = document.getElementById('functionSelect');
const colonySizeInput = document.getElementById('colonySize');
const maxCyclesInput = document.getElementById('maxCycles');
const limitInput = document.getElementById('limit');
const modificationRateInput = document.getElementById('modificationRate');

const optimizeBtn = document.getElementById('optimizeBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const cycleCount = document.getElementById('cycleCount');
const bestPos = document.getElementById('bestPos');
const bestFitness = document.getElementById('bestFitness');
const scoutEvents = document.getElementById('scoutEvents');

const colonyCanvas = document.getElementById('colonyCanvas');
const fitnessCanvas = document.getElementById('fitnessCanvas');
const diversityCanvas = document.getElementById('diversityCanvas');
const colonyCtx = colonyCanvas.getContext('2d');
const fitCtx = fitnessCanvas.getContext('2d');
const divCtx = diversityCanvas.getContext('2d');

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
    progressText.textContent = `Cycle ${data.cycle} | Best: ${data.bestFitness.toExponential(4)} | Scouts: ${data.scoutEvents}`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    cycleCount.textContent = data.cycles;
    bestPos.textContent = `(${data.bestPosition[0].toFixed(6)}, ${data.bestPosition[1].toFixed(6)})`;
    bestFitness.textContent = data.bestFitness.toExponential(6);
    scoutEvents.textContent = data.scoutEvents;
    drawColony(data);
    drawFitnessHistory(data);
    drawDiversityHistory(data);
    resetUI();
}

function drawColony(data) {
    const { sources, bounds, optimum, bestPosition } = data;
    const w = colonyCanvas.width, h = colonyCanvas.height, p = 45;
    colonyCtx.fillStyle = '#0f0e08'; colonyCtx.fillRect(0, 0, w, h);
    const pw = w - p * 2, ph = h - p * 2;
    const mapX = x => p + (x - bounds.xMin) / (bounds.xMax - bounds.xMin) * pw;
    const mapY = y => h - p - (y - bounds.yMin) / (bounds.yMax - bounds.yMin) * ph;

    // Grid
    colonyCtx.strokeStyle = '#1a1808'; colonyCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        colonyCtx.beginPath(); colonyCtx.moveTo(p + i / 10 * pw, p); colonyCtx.lineTo(p + i / 10 * pw, h - p); colonyCtx.stroke();
        colonyCtx.beginPath(); colonyCtx.moveTo(p, p + i / 10 * ph); colonyCtx.lineTo(w - p, p + i / 10 * ph); colonyCtx.stroke();
    }

    // Labels
    colonyCtx.fillStyle = '#8a7a2a'; colonyCtx.font = '10px monospace'; colonyCtx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
        colonyCtx.fillText((bounds.xMin + i / 4 * (bounds.xMax - bounds.xMin)).toFixed(1), p + i / 4 * pw, h - p + 15);
        colonyCtx.textAlign = 'right';
        colonyCtx.fillText((bounds.yMin + i / 4 * (bounds.yMax - bounds.yMin)).toFixed(1), p - 5, h - p - i / 4 * ph + 3);
        colonyCtx.textAlign = 'center';
    }

    // Global optimum
    colonyCtx.fillStyle = '#22c55e';
    colonyCtx.beginPath();
    colonyCtx.arc(mapX(optimum[0]), mapY(optimum[1]), 12, 0, Math.PI * 2);
    colonyCtx.fill();
    colonyCtx.fillStyle = '#0f0e08';
    colonyCtx.font = 'bold 10px sans-serif';
    colonyCtx.fillText('*', mapX(optimum[0]), mapY(optimum[1]) + 4);

    // Food sources (fitness-based coloring)
    const minFit = Math.min(...sources.map(s => s.fitness));
    const maxFit = Math.max(...sources.map(s => s.fitness));
    const fitRange = maxFit - minFit || 1;

    for (const source of sources) {
        const t = 1 - (source.fitness - minFit) / fitRange;
        // Yellow to red gradient based on fitness
        const r = 250;
        const g = Math.round(180 + 70 * t);
        const b = Math.round(50 * (1 - t));
        colonyCtx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        colonyCtx.beginPath();
        colonyCtx.arc(mapX(source.x), mapY(source.y), 6, 0, Math.PI * 2);
        colonyCtx.fill();
    }

    // Best found
    colonyCtx.fillStyle = '#facc15';
    colonyCtx.beginPath();
    colonyCtx.arc(mapX(bestPosition[0]), mapY(bestPosition[1]), 10, 0, Math.PI * 2);
    colonyCtx.fill();
    colonyCtx.strokeStyle = '#fff';
    colonyCtx.lineWidth = 2;
    colonyCtx.stroke();

    // Draw a bee icon at best position
    colonyCtx.fillStyle = '#1a1a0a';
    colonyCtx.font = 'bold 8px sans-serif';
    colonyCtx.fillText('B', mapX(bestPosition[0]), mapY(bestPosition[1]) + 3);

    // Border
    colonyCtx.strokeStyle = '#3a3a1a'; colonyCtx.lineWidth = 2; colonyCtx.strokeRect(p, p, pw, ph);

    // Legend
    colonyCtx.font = '11px sans-serif';
    colonyCtx.fillStyle = '#22c55e'; colonyCtx.fillText('Optimum', w - p - 30, p + 15);
    colonyCtx.fillStyle = '#facc15'; colonyCtx.fillText('Best Found', w - p - 30, p + 30);
}

function drawFitnessHistory(data) {
    const { fitnessHistory } = data;
    const w = fitnessCanvas.width, h = fitnessCanvas.height, p = 35;
    fitCtx.fillStyle = '#0f0e08'; fitCtx.fillRect(0, 0, w, h);
    if (fitnessHistory.length < 2) return;

    const pw = w - p * 2, ph = h - p - 20;
    const logBest = fitnessHistory.map(f => Math.log10(Math.max(f.best + 1, 1)));
    const logAvg = fitnessHistory.map(f => Math.log10(Math.max(f.avg + 1, 1)));
    const allLog = [...logBest, ...logAvg];
    const minLog = Math.min(...allLog), maxLog = Math.max(...allLog);
    const range = maxLog - minLog || 1;

    // Grid
    fitCtx.strokeStyle = '#1a1808'; fitCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        fitCtx.beginPath(); fitCtx.moveTo(p, 10 + i / 4 * ph); fitCtx.lineTo(w - 10, 10 + i / 4 * ph); fitCtx.stroke();
    }

    // Average fitness
    fitCtx.strokeStyle = '#fde047'; fitCtx.lineWidth = 1; fitCtx.beginPath();
    for (let i = 0; i < logAvg.length; i++) {
        const x = p + i / (logAvg.length - 1) * pw;
        const y = h - p - ((logAvg[i] - minLog) / range) * ph;
        i === 0 ? fitCtx.moveTo(x, y) : fitCtx.lineTo(x, y);
    }
    fitCtx.stroke();

    // Best fitness
    fitCtx.strokeStyle = '#facc15'; fitCtx.lineWidth = 2; fitCtx.beginPath();
    for (let i = 0; i < logBest.length; i++) {
        const x = p + i / (logBest.length - 1) * pw;
        const y = h - p - ((logBest[i] - minLog) / range) * ph;
        i === 0 ? fitCtx.moveTo(x, y) : fitCtx.lineTo(x, y);
    }
    fitCtx.stroke();

    // Legend
    fitCtx.fillStyle = '#fde047'; fitCtx.font = '9px sans-serif';
    fitCtx.fillText('Avg', p + 5, 18);
    fitCtx.fillStyle = '#facc15';
    fitCtx.fillText('Best', p + 35, 18);
}

function drawDiversityHistory(data) {
    const { diversityHistory } = data;
    const w = diversityCanvas.width, h = diversityCanvas.height, p = 35;
    divCtx.fillStyle = '#0f0e08'; divCtx.fillRect(0, 0, w, h);
    if (diversityHistory.length < 2) return;

    const pw = w - p * 2, ph = h - p - 20;
    const minDiv = Math.min(...diversityHistory);
    const maxDiv = Math.max(...diversityHistory);
    const range = maxDiv - minDiv || 1;

    // Grid
    divCtx.strokeStyle = '#1a1808'; divCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        divCtx.beginPath(); divCtx.moveTo(p, 10 + i / 4 * ph); divCtx.lineTo(w - 10, 10 + i / 4 * ph); divCtx.stroke();
    }

    // Diversity curve
    divCtx.strokeStyle = '#eab308'; divCtx.lineWidth = 2; divCtx.beginPath();
    for (let i = 0; i < diversityHistory.length; i++) {
        const x = p + i / (diversityHistory.length - 1) * pw;
        const y = h - p - ((diversityHistory[i] - minDiv) / range) * ph;
        i === 0 ? divCtx.moveTo(x, y) : divCtx.lineTo(x, y);
    }
    divCtx.stroke();

    // Labels
    divCtx.fillStyle = '#8a7a2a'; divCtx.font = '9px monospace'; divCtx.textAlign = 'right';
    divCtx.fillText(maxDiv.toFixed(2), p - 3, 15);
    divCtx.fillText(minDiv.toFixed(2), p - 3, h - p + 3);
}

function resetUI() { optimizeBtn.classList.remove('hidden'); stopBtn.classList.add('hidden'); }

function startOptimization() {
    const params = {
        functionName: functionSelect.value,
        colonySize: parseInt(colonySizeInput.value),
        maxCycles: parseInt(maxCyclesInput.value),
        limit: parseInt(limitInput.value),
        modificationRate: parseFloat(modificationRateInput.value)
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
    colonyCtx.fillStyle = '#0f0e08'; colonyCtx.fillRect(0, 0, colonyCanvas.width, colonyCanvas.height);
    colonyCtx.fillStyle = '#8a7a2a'; colonyCtx.font = '14px sans-serif'; colonyCtx.textAlign = 'center';
    colonyCtx.fillText('Click "Start ABC" to begin', colonyCanvas.width / 2, colonyCanvas.height / 2);
    fitCtx.fillStyle = '#0f0e08'; fitCtx.fillRect(0, 0, fitnessCanvas.width, fitnessCanvas.height);
    divCtx.fillStyle = '#0f0e08'; divCtx.fillRect(0, 0, diversityCanvas.width, diversityCanvas.height);
}

optimizeBtn.addEventListener('click', startOptimization);
stopBtn.addEventListener('click', stopOptimization);
resetBtn.addEventListener('click', reset);
reset();
