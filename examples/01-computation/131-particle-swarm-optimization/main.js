// Particle Swarm Optimization - Main Thread

const functionSelect = document.getElementById('functionSelect');
const swarmSizeInput = document.getElementById('swarmSize');
const maxIterationsInput = document.getElementById('maxIterations');
const inertiaWeightInput = document.getElementById('inertiaWeight');
const cognitiveCoeffInput = document.getElementById('cognitiveCoeff');
const socialCoeffInput = document.getElementById('socialCoeff');
const velocityClampInput = document.getElementById('velocityClamp');
const variantSelect = document.getElementById('variant');

const optimizeBtn = document.getElementById('optimizeBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const iterCount = document.getElementById('iterCount');
const bestPos = document.getElementById('bestPos');
const bestFitness = document.getElementById('bestFitness');
const convergence = document.getElementById('convergence');

const swarmCanvas = document.getElementById('swarmCanvas');
const fitnessCanvas = document.getElementById('fitnessCanvas');
const spreadCanvas = document.getElementById('spreadCanvas');
const swarmCtx = swarmCanvas.getContext('2d');
const fitCtx = fitnessCanvas.getContext('2d');
const spreadCtx = spreadCanvas.getContext('2d');

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
    progressText.textContent = `Iter ${data.iteration} | Best: ${data.bestFitness.toExponential(4)} | Spread: ${data.spread}`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    iterCount.textContent = data.iterations;
    bestPos.textContent = `(${data.bestPosition[0].toFixed(6)}, ${data.bestPosition[1].toFixed(6)})`;
    bestFitness.textContent = data.bestFitness.toExponential(6);
    convergence.textContent = data.finalSpread < 0.01 ? 'Converged' : 'Spread: ' + data.finalSpread.toFixed(4);
    drawSwarm(data);
    drawFitnessHistory(data);
    drawSpreadHistory(data);
    resetUI();
}

function drawSwarm(data) {
    const { finalSwarm, bounds, optimum, bestPosition } = data;
    const w = swarmCanvas.width, h = swarmCanvas.height, p = 45;
    swarmCtx.fillStyle = '#0a0f14'; swarmCtx.fillRect(0, 0, w, h);
    const pw = w - p * 2, ph = h - p * 2;
    const mapX = x => p + (x - bounds.xMin) / (bounds.xMax - bounds.xMin) * pw;
    const mapY = y => h - p - (y - bounds.yMin) / (bounds.yMax - bounds.yMin) * ph;

    // Grid
    swarmCtx.strokeStyle = '#141a20'; swarmCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        swarmCtx.beginPath(); swarmCtx.moveTo(p + i / 10 * pw, p); swarmCtx.lineTo(p + i / 10 * pw, h - p); swarmCtx.stroke();
        swarmCtx.beginPath(); swarmCtx.moveTo(p, p + i / 10 * ph); swarmCtx.lineTo(w - p, p + i / 10 * ph); swarmCtx.stroke();
    }

    // Labels
    swarmCtx.fillStyle = '#5a6a8a'; swarmCtx.font = '10px monospace'; swarmCtx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) {
        swarmCtx.fillText((bounds.xMin + i / 4 * (bounds.xMax - bounds.xMin)).toFixed(1), p + i / 4 * pw, h - p + 15);
        swarmCtx.textAlign = 'right';
        swarmCtx.fillText((bounds.yMin + i / 4 * (bounds.yMax - bounds.yMin)).toFixed(1), p - 5, h - p - i / 4 * ph + 3);
        swarmCtx.textAlign = 'center';
    }

    // Global optimum
    swarmCtx.fillStyle = '#f59e0b';
    swarmCtx.beginPath();
    swarmCtx.arc(mapX(optimum[0]), mapY(optimum[1]), 12, 0, Math.PI * 2);
    swarmCtx.fill();
    swarmCtx.fillStyle = '#0a0f14';
    swarmCtx.font = 'bold 10px sans-serif';
    swarmCtx.fillText('*', mapX(optimum[0]), mapY(optimum[1]) + 4);

    // Particles with fitness-based coloring
    const minFit = Math.min(...finalSwarm.map(p => p.fitness));
    const maxFit = Math.max(...finalSwarm.map(p => p.fitness));
    const fitRange = maxFit - minFit || 1;

    for (const particle of finalSwarm) {
        const t = 1 - (particle.fitness - minFit) / fitRange; // 0 = worst, 1 = best
        const r = Math.round(255 * (1 - t));
        const g = Math.round(100 + 155 * t);
        const b = Math.round(250);
        swarmCtx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        swarmCtx.beginPath();
        swarmCtx.arc(mapX(particle.x), mapY(particle.y), 5, 0, Math.PI * 2);
        swarmCtx.fill();
    }

    // Best found
    swarmCtx.fillStyle = '#22c55e';
    swarmCtx.beginPath();
    swarmCtx.arc(mapX(bestPosition[0]), mapY(bestPosition[1]), 9, 0, Math.PI * 2);
    swarmCtx.fill();
    swarmCtx.strokeStyle = '#fff';
    swarmCtx.lineWidth = 2;
    swarmCtx.stroke();

    // Border
    swarmCtx.strokeStyle = '#2a3a4a'; swarmCtx.lineWidth = 2; swarmCtx.strokeRect(p, p, pw, ph);

    // Legend
    swarmCtx.font = '11px sans-serif';
    swarmCtx.fillStyle = '#f59e0b'; swarmCtx.fillText('Optimum', w - p - 30, p + 15);
    swarmCtx.fillStyle = '#22c55e'; swarmCtx.fillText('Best Found', w - p - 30, p + 30);
}

function drawFitnessHistory(data) {
    const { fitnessHistory } = data;
    const w = fitnessCanvas.width, h = fitnessCanvas.height, p = 35;
    fitCtx.fillStyle = '#0a0f14'; fitCtx.fillRect(0, 0, w, h);
    if (fitnessHistory.length < 2) return;

    const pw = w - p * 2, ph = h - p - 20;
    const logFit = fitnessHistory.map(f => Math.log10(Math.max(f + 1, 1)));
    const minLog = Math.min(...logFit), maxLog = Math.max(...logFit);
    const range = maxLog - minLog || 1;

    // Grid
    fitCtx.strokeStyle = '#141a20'; fitCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        fitCtx.beginPath(); fitCtx.moveTo(p, 10 + i / 4 * ph); fitCtx.lineTo(w - 10, 10 + i / 4 * ph); fitCtx.stroke();
    }

    // Fitness curve
    fitCtx.strokeStyle = '#60a5fa'; fitCtx.lineWidth = 2; fitCtx.beginPath();
    for (let i = 0; i < logFit.length; i++) {
        const x = p + i / (logFit.length - 1) * pw;
        const y = h - p - ((logFit[i] - minLog) / range) * ph;
        i === 0 ? fitCtx.moveTo(x, y) : fitCtx.lineTo(x, y);
    }
    fitCtx.stroke();

    // Labels
    fitCtx.fillStyle = '#5a6a8a'; fitCtx.font = '9px monospace'; fitCtx.textAlign = 'right';
    fitCtx.fillText('1e' + maxLog.toFixed(0), p - 3, 15);
    fitCtx.fillText('1e' + minLog.toFixed(0), p - 3, h - p + 3);
}

function drawSpreadHistory(data) {
    const { spreadHistory } = data;
    const w = spreadCanvas.width, h = spreadCanvas.height, p = 35;
    spreadCtx.fillStyle = '#0a0f14'; spreadCtx.fillRect(0, 0, w, h);
    if (spreadHistory.length < 2) return;

    const pw = w - p * 2, ph = h - p - 20;
    const minSpread = Math.min(...spreadHistory);
    const maxSpread = Math.max(...spreadHistory);
    const range = maxSpread - minSpread || 1;

    // Grid
    spreadCtx.strokeStyle = '#141a20'; spreadCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        spreadCtx.beginPath(); spreadCtx.moveTo(p, 10 + i / 4 * ph); spreadCtx.lineTo(w - 10, 10 + i / 4 * ph); spreadCtx.stroke();
    }

    // Spread curve
    spreadCtx.strokeStyle = '#a78bfa'; spreadCtx.lineWidth = 2; spreadCtx.beginPath();
    for (let i = 0; i < spreadHistory.length; i++) {
        const x = p + i / (spreadHistory.length - 1) * pw;
        const y = h - p - ((spreadHistory[i] - minSpread) / range) * ph;
        i === 0 ? spreadCtx.moveTo(x, y) : spreadCtx.lineTo(x, y);
    }
    spreadCtx.stroke();

    // Labels
    spreadCtx.fillStyle = '#5a6a8a'; spreadCtx.font = '9px monospace'; spreadCtx.textAlign = 'right';
    spreadCtx.fillText(maxSpread.toFixed(2), p - 3, 15);
    spreadCtx.fillText(minSpread.toFixed(2), p - 3, h - p + 3);
}

function resetUI() { optimizeBtn.classList.remove('hidden'); stopBtn.classList.add('hidden'); }

function startOptimization() {
    const params = {
        functionName: functionSelect.value,
        swarmSize: parseInt(swarmSizeInput.value),
        maxIterations: parseInt(maxIterationsInput.value),
        inertiaWeight: parseFloat(inertiaWeightInput.value),
        cognitiveCoeff: parseFloat(cognitiveCoeffInput.value),
        socialCoeff: parseFloat(socialCoeffInput.value),
        velocityClamp: parseFloat(velocityClampInput.value),
        variant: variantSelect.value
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
    swarmCtx.fillStyle = '#0a0f14'; swarmCtx.fillRect(0, 0, swarmCanvas.width, swarmCanvas.height);
    swarmCtx.fillStyle = '#5a6a8a'; swarmCtx.font = '14px sans-serif'; swarmCtx.textAlign = 'center';
    swarmCtx.fillText('Click "Start PSO" to begin', swarmCanvas.width / 2, swarmCanvas.height / 2);
    fitCtx.fillStyle = '#0a0f14'; fitCtx.fillRect(0, 0, fitnessCanvas.width, fitnessCanvas.height);
    spreadCtx.fillStyle = '#0a0f14'; spreadCtx.fillRect(0, 0, spreadCanvas.width, spreadCanvas.height);
}

optimizeBtn.addEventListener('click', startOptimization);
stopBtn.addEventListener('click', stopOptimization);
resetBtn.addEventListener('click', reset);
reset();
