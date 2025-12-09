// Genetic Algorithm - Main Thread

const functionSelect = document.getElementById('functionSelect');
const populationSizeInput = document.getElementById('populationSize');
const maxGenerationsInput = document.getElementById('maxGenerations');
const crossoverRateInput = document.getElementById('crossoverRate');
const mutationRateInput = document.getElementById('mutationRate');
const selectionMethodSelect = document.getElementById('selectionMethod');
const tournamentSizeInput = document.getElementById('tournamentSize');
const elitismInput = document.getElementById('elitism');
const crossoverTypeSelect = document.getElementById('crossoverType');

const evolveBtn = document.getElementById('evolveBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const genCount = document.getElementById('genCount');
const bestPos = document.getElementById('bestPos');
const bestFitness = document.getElementById('bestFitness');
const diversity = document.getElementById('diversity');

const populationCanvas = document.getElementById('populationCanvas');
const fitnessCanvas = document.getElementById('fitnessCanvas');
const diversityCanvas = document.getElementById('diversityCanvas');
const popCtx = populationCanvas.getContext('2d');
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
    progressText.textContent = `Gen ${data.generation} | Best: ${data.bestFitness.toExponential(4)} | Avg: ${data.avgFitness.toExponential(4)} | Div: ${data.diversity}`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    genCount.textContent = data.generations;
    bestPos.textContent = `(${data.bestPosition[0].toFixed(6)}, ${data.bestPosition[1].toFixed(6)})`;
    bestFitness.textContent = data.bestFitness.toExponential(6);
    diversity.textContent = data.finalDiversity.toFixed(6);
    drawPopulation(data);
    drawFitnessHistory(data);
    drawDiversityHistory(data);
    resetUI();
}

function drawPopulation(data) {
    const { finalPopulation, bounds, optimum, bestPosition } = data;
    const w = populationCanvas.width, h = populationCanvas.height, p = 45;
    popCtx.fillStyle = '#0a140f'; popCtx.fillRect(0, 0, w, h);
    const pw = w - p * 2, ph = h - p * 2;
    const mapX = x => p + (x - bounds.xMin) / (bounds.xMax - bounds.xMin) * pw;
    const mapY = y => h - p - (y - bounds.yMin) / (bounds.yMax - bounds.yMin) * ph;

    // Grid
    popCtx.strokeStyle = '#142018'; popCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        popCtx.beginPath(); popCtx.moveTo(p + i / 10 * pw, p); popCtx.lineTo(p + i / 10 * pw, h - p); popCtx.stroke();
        popCtx.beginPath(); popCtx.moveTo(p, p + i / 10 * ph); popCtx.lineTo(w - p, p + i / 10 * ph); popCtx.stroke();
    }

    // Labels
    popCtx.fillStyle = '#5a8a6b'; popCtx.font = '10px monospace'; popCtx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
        popCtx.fillText((bounds.xMin + i / 4 * (bounds.xMax - bounds.xMin)).toFixed(1), p + i / 4 * pw, h - p + 15);
        popCtx.textAlign = 'right';
        popCtx.fillText((bounds.yMin + i / 4 * (bounds.yMax - bounds.yMin)).toFixed(1), p - 5, h - p - i / 4 * ph + 3);
        popCtx.textAlign = 'center';
    }

    // Global optimum
    popCtx.fillStyle = '#f59e0b';
    popCtx.beginPath();
    popCtx.arc(mapX(optimum[0]), mapY(optimum[1]), 12, 0, Math.PI * 2);
    popCtx.fill();
    popCtx.fillStyle = '#0a140f';
    popCtx.font = 'bold 10px sans-serif';
    popCtx.fillText('*', mapX(optimum[0]), mapY(optimum[1]) + 4);

    // Population individuals
    for (const [x, y] of finalPopulation) {
        popCtx.fillStyle = 'rgba(74, 222, 128, 0.5)';
        popCtx.beginPath();
        popCtx.arc(mapX(x), mapY(y), 4, 0, Math.PI * 2);
        popCtx.fill();
    }

    // Best individual
    popCtx.fillStyle = '#22c55e';
    popCtx.beginPath();
    popCtx.arc(mapX(bestPosition[0]), mapY(bestPosition[1]), 8, 0, Math.PI * 2);
    popCtx.fill();
    popCtx.strokeStyle = '#fff';
    popCtx.lineWidth = 2;
    popCtx.stroke();

    // Border
    popCtx.strokeStyle = '#2a4a3a'; popCtx.lineWidth = 2; popCtx.strokeRect(p, p, pw, ph);

    // Legend
    popCtx.font = '11px sans-serif';
    popCtx.fillStyle = '#f59e0b'; popCtx.fillText('Optimum', w - p - 30, p + 15);
    popCtx.fillStyle = '#22c55e'; popCtx.fillText('Best Found', w - p - 30, p + 30);
}

function drawFitnessHistory(data) {
    const { fitnessHistory } = data;
    const w = fitnessCanvas.width, h = fitnessCanvas.height, p = 35;
    fitCtx.fillStyle = '#0a140f'; fitCtx.fillRect(0, 0, w, h);
    if (fitnessHistory.length < 2) return;

    const pw = w - p * 2, ph = h - p - 20;
    const logBest = fitnessHistory.map(f => Math.log10(Math.max(f.best + 1, 1)));
    const logAvg = fitnessHistory.map(f => Math.log10(Math.max(f.avg + 1, 1)));
    const allLog = [...logBest, ...logAvg];
    const minLog = Math.min(...allLog), maxLog = Math.max(...allLog);
    const range = maxLog - minLog || 1;

    // Grid
    fitCtx.strokeStyle = '#142018'; fitCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        fitCtx.beginPath(); fitCtx.moveTo(p, 10 + i / 4 * ph); fitCtx.lineTo(w - 10, 10 + i / 4 * ph); fitCtx.stroke();
    }

    // Average fitness line
    fitCtx.strokeStyle = '#a3e635'; fitCtx.lineWidth = 1; fitCtx.beginPath();
    for (let i = 0; i < logAvg.length; i++) {
        const x = p + i / (logAvg.length - 1) * pw;
        const y = h - p - ((logAvg[i] - minLog) / range) * ph;
        i === 0 ? fitCtx.moveTo(x, y) : fitCtx.lineTo(x, y);
    }
    fitCtx.stroke();

    // Best fitness line
    fitCtx.strokeStyle = '#22c55e'; fitCtx.lineWidth = 2; fitCtx.beginPath();
    for (let i = 0; i < logBest.length; i++) {
        const x = p + i / (logBest.length - 1) * pw;
        const y = h - p - ((logBest[i] - minLog) / range) * ph;
        i === 0 ? fitCtx.moveTo(x, y) : fitCtx.lineTo(x, y);
    }
    fitCtx.stroke();

    // Legend
    fitCtx.fillStyle = '#a3e635'; fitCtx.font = '9px sans-serif';
    fitCtx.fillText('Avg', p + 5, 18);
    fitCtx.fillStyle = '#22c55e';
    fitCtx.fillText('Best', p + 35, 18);
}

function drawDiversityHistory(data) {
    const { diversityHistory } = data;
    const w = diversityCanvas.width, h = diversityCanvas.height, p = 35;
    divCtx.fillStyle = '#0a140f'; divCtx.fillRect(0, 0, w, h);
    if (diversityHistory.length < 2) return;

    const pw = w - p * 2, ph = h - p - 20;
    const minDiv = Math.min(...diversityHistory);
    const maxDiv = Math.max(...diversityHistory);
    const range = maxDiv - minDiv || 1;

    // Grid
    divCtx.strokeStyle = '#142018'; divCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        divCtx.beginPath(); divCtx.moveTo(p, 10 + i / 4 * ph); divCtx.lineTo(w - 10, 10 + i / 4 * ph); divCtx.stroke();
    }

    // Diversity curve
    divCtx.strokeStyle = '#4ade80'; divCtx.lineWidth = 2; divCtx.beginPath();
    for (let i = 0; i < diversityHistory.length; i++) {
        const x = p + i / (diversityHistory.length - 1) * pw;
        const y = h - p - ((diversityHistory[i] - minDiv) / range) * ph;
        i === 0 ? divCtx.moveTo(x, y) : divCtx.lineTo(x, y);
    }
    divCtx.stroke();

    // Labels
    divCtx.fillStyle = '#5a8a6b'; divCtx.font = '9px monospace'; divCtx.textAlign = 'right';
    divCtx.fillText(maxDiv.toFixed(2), p - 3, 15);
    divCtx.fillText(minDiv.toFixed(2), p - 3, h - p + 3);
}

function resetUI() { evolveBtn.classList.remove('hidden'); stopBtn.classList.add('hidden'); }

function startEvolution() {
    const params = {
        functionName: functionSelect.value,
        populationSize: parseInt(populationSizeInput.value),
        maxGenerations: parseInt(maxGenerationsInput.value),
        crossoverRate: parseFloat(crossoverRateInput.value),
        mutationRate: parseFloat(mutationRateInput.value),
        selectionMethod: selectionMethodSelect.value,
        tournamentSize: parseInt(tournamentSizeInput.value),
        elitism: parseInt(elitismInput.value),
        crossoverType: crossoverTypeSelect.value
    };
    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    evolveBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    initWorker();
    worker.postMessage({ params });
}

function stopEvolution() { if (worker) { worker.terminate(); worker = null; } resetUI(); progressContainer.classList.add('hidden'); }

function reset() {
    stopEvolution(); resultContainer.classList.add('hidden');
    popCtx.fillStyle = '#0a140f'; popCtx.fillRect(0, 0, populationCanvas.width, populationCanvas.height);
    popCtx.fillStyle = '#5a8a6b'; popCtx.font = '14px sans-serif'; popCtx.textAlign = 'center';
    popCtx.fillText('Click "Start Evolution" to begin', populationCanvas.width / 2, populationCanvas.height / 2);
    fitCtx.fillStyle = '#0a140f'; fitCtx.fillRect(0, 0, fitnessCanvas.width, fitnessCanvas.height);
    divCtx.fillStyle = '#0a140f'; divCtx.fillRect(0, 0, diversityCanvas.width, diversityCanvas.height);
}

evolveBtn.addEventListener('click', startEvolution);
stopBtn.addEventListener('click', stopEvolution);
resetBtn.addEventListener('click', reset);
reset();
