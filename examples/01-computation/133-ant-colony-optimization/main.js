// Ant Colony Optimization - Main Thread

const numCitiesInput = document.getElementById('numCities');
const numAntsInput = document.getElementById('numAnts');
const maxIterationsInput = document.getElementById('maxIterations');
const alphaInput = document.getElementById('alpha');
const betaInput = document.getElementById('beta');
const evaporationRateInput = document.getElementById('evaporationRate');
const QInput = document.getElementById('Q');
const elitistInput = document.getElementById('elitist');

const optimizeBtn = document.getElementById('optimizeBtn');
const stopBtn = document.getElementById('stopBtn');
const newCitiesBtn = document.getElementById('newCitiesBtn');
const resetBtn = document.getElementById('resetBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const iterCount = document.getElementById('iterCount');
const bestLength = document.getElementById('bestLength');
const improvement = document.getElementById('improvement');
const stagnation = document.getElementById('stagnation');

const tourCanvas = document.getElementById('tourCanvas');
const lengthCanvas = document.getElementById('lengthCanvas');
const pheromoneCanvas = document.getElementById('pheromoneCanvas');
const tourCtx = tourCanvas.getContext('2d');
const lenCtx = lengthCanvas.getContext('2d');
const pheCtx = pheromoneCanvas.getContext('2d');

let worker = null;
let cities = [];

function generateCities(n) {
    cities = [];
    const padding = 50;
    const w = tourCanvas.width - padding * 2;
    const h = tourCanvas.height - padding * 2;

    for (let i = 0; i < n; i++) {
        cities.push({
            x: padding + Math.random() * w,
            y: padding + Math.random() * h
        });
    }
    drawCities();
}

function drawCities() {
    const w = tourCanvas.width, h = tourCanvas.height;
    tourCtx.fillStyle = '#0f0a08';
    tourCtx.fillRect(0, 0, w, h);

    // Draw cities
    for (let i = 0; i < cities.length; i++) {
        tourCtx.fillStyle = '#fbbf24';
        tourCtx.beginPath();
        tourCtx.arc(cities[i].x, cities[i].y, 6, 0, Math.PI * 2);
        tourCtx.fill();
        tourCtx.fillStyle = '#fde68a';
        tourCtx.font = '10px sans-serif';
        tourCtx.textAlign = 'center';
        tourCtx.fillText(i, cities[i].x, cities[i].y - 10);
    }
}

function drawTour(tour) {
    drawCities();

    if (!tour || tour.length < 2) return;

    // Draw tour path
    tourCtx.strokeStyle = '#22c55e';
    tourCtx.lineWidth = 2;
    tourCtx.beginPath();
    tourCtx.moveTo(cities[tour[0]].x, cities[tour[0]].y);

    for (let i = 1; i < tour.length; i++) {
        tourCtx.lineTo(cities[tour[i]].x, cities[tour[i]].y);
    }
    tourCtx.lineTo(cities[tour[0]].x, cities[tour[0]].y); // Close the tour
    tourCtx.stroke();

    // Highlight start city
    tourCtx.fillStyle = '#ef4444';
    tourCtx.beginPath();
    tourCtx.arc(cities[tour[0]].x, cities[tour[0]].y, 8, 0, Math.PI * 2);
    tourCtx.fill();
}

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
    progressText.textContent = `Iter ${data.iteration} | Best: ${data.bestLength} | Avg: ${data.avgLength}`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    iterCount.textContent = data.iterations;
    bestLength.textContent = data.bestLength.toFixed(2);
    improvement.textContent = data.improvement + '%';
    stagnation.textContent = data.stagnation + ' iterations';
    drawTour(data.bestTour);
    drawLengthHistory(data);
    drawPheromoneHistory(data);
    resetUI();
}

function drawLengthHistory(data) {
    const { lengthHistory } = data;
    const w = lengthCanvas.width, h = lengthCanvas.height, p = 35;
    lenCtx.fillStyle = '#0f0a08'; lenCtx.fillRect(0, 0, w, h);
    if (lengthHistory.length < 2) return;

    const pw = w - p * 2, ph = h - p - 20;
    const bestVals = lengthHistory.map(l => l.best);
    const avgVals = lengthHistory.map(l => l.avg);
    const allVals = [...bestVals, ...avgVals];
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const range = maxVal - minVal || 1;

    // Grid
    lenCtx.strokeStyle = '#1a1408'; lenCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        lenCtx.beginPath(); lenCtx.moveTo(p, 10 + i / 4 * ph); lenCtx.lineTo(w - 10, 10 + i / 4 * ph); lenCtx.stroke();
    }

    // Average line
    lenCtx.strokeStyle = '#fcd34d'; lenCtx.lineWidth = 1; lenCtx.beginPath();
    for (let i = 0; i < avgVals.length; i++) {
        const x = p + i / (avgVals.length - 1) * pw;
        const y = h - p - ((avgVals[i] - minVal) / range) * ph;
        i === 0 ? lenCtx.moveTo(x, y) : lenCtx.lineTo(x, y);
    }
    lenCtx.stroke();

    // Best line
    lenCtx.strokeStyle = '#22c55e'; lenCtx.lineWidth = 2; lenCtx.beginPath();
    for (let i = 0; i < bestVals.length; i++) {
        const x = p + i / (bestVals.length - 1) * pw;
        const y = h - p - ((bestVals[i] - minVal) / range) * ph;
        i === 0 ? lenCtx.moveTo(x, y) : lenCtx.lineTo(x, y);
    }
    lenCtx.stroke();

    // Legend
    lenCtx.fillStyle = '#fcd34d'; lenCtx.font = '9px sans-serif';
    lenCtx.fillText('Avg', p + 5, 18);
    lenCtx.fillStyle = '#22c55e';
    lenCtx.fillText('Best', p + 35, 18);
}

function drawPheromoneHistory(data) {
    const { pheromoneHistory } = data;
    const w = pheromoneCanvas.width, h = pheromoneCanvas.height, p = 35;
    pheCtx.fillStyle = '#0f0a08'; pheCtx.fillRect(0, 0, w, h);
    if (pheromoneHistory.length < 2) return;

    const pw = w - p * 2, ph = h - p - 20;
    const minPhe = Math.min(...pheromoneHistory);
    const maxPhe = Math.max(...pheromoneHistory);
    const range = maxPhe - minPhe || 1;

    // Grid
    pheCtx.strokeStyle = '#1a1408'; pheCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        pheCtx.beginPath(); pheCtx.moveTo(p, 10 + i / 4 * ph); pheCtx.lineTo(w - 10, 10 + i / 4 * ph); pheCtx.stroke();
    }

    // Pheromone curve
    pheCtx.strokeStyle = '#fbbf24'; pheCtx.lineWidth = 2; pheCtx.beginPath();
    for (let i = 0; i < pheromoneHistory.length; i++) {
        const x = p + i / (pheromoneHistory.length - 1) * pw;
        const y = h - p - ((pheromoneHistory[i] - minPhe) / range) * ph;
        i === 0 ? pheCtx.moveTo(x, y) : pheCtx.lineTo(x, y);
    }
    pheCtx.stroke();

    // Labels
    pheCtx.fillStyle = '#8a6a2a'; pheCtx.font = '9px monospace'; pheCtx.textAlign = 'right';
    pheCtx.fillText(maxPhe.toExponential(1), p - 3, 15);
    pheCtx.fillText(minPhe.toExponential(1), p - 3, h - p + 3);
}

function resetUI() { optimizeBtn.classList.remove('hidden'); stopBtn.classList.add('hidden'); }

function startOptimization() {
    if (cities.length === 0) {
        generateCities(parseInt(numCitiesInput.value));
    }

    const params = {
        numAnts: parseInt(numAntsInput.value),
        maxIterations: parseInt(maxIterationsInput.value),
        alpha: parseFloat(alphaInput.value),
        beta: parseFloat(betaInput.value),
        evaporationRate: parseFloat(evaporationRateInput.value),
        Q: parseFloat(QInput.value),
        elitist: parseInt(elitistInput.value)
    };

    resultContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    optimizeBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    initWorker();
    worker.postMessage({ params, cities });
}

function stopOptimization() {
    if (worker) { worker.terminate(); worker = null; }
    resetUI();
    progressContainer.classList.add('hidden');
}

function newCities() {
    stopOptimization();
    resultContainer.classList.add('hidden');
    generateCities(parseInt(numCitiesInput.value));
    lenCtx.fillStyle = '#0f0a08'; lenCtx.fillRect(0, 0, lengthCanvas.width, lengthCanvas.height);
    pheCtx.fillStyle = '#0f0a08'; pheCtx.fillRect(0, 0, pheromoneCanvas.width, pheromoneCanvas.height);
}

function reset() {
    stopOptimization();
    resultContainer.classList.add('hidden');
    cities = [];
    tourCtx.fillStyle = '#0f0a08'; tourCtx.fillRect(0, 0, tourCanvas.width, tourCanvas.height);
    tourCtx.fillStyle = '#8a6a2a'; tourCtx.font = '14px sans-serif'; tourCtx.textAlign = 'center';
    tourCtx.fillText('Click "New Cities" or "Start ACO" to begin', tourCanvas.width / 2, tourCanvas.height / 2);
    lenCtx.fillStyle = '#0f0a08'; lenCtx.fillRect(0, 0, lengthCanvas.width, lengthCanvas.height);
    pheCtx.fillStyle = '#0f0a08'; pheCtx.fillRect(0, 0, pheromoneCanvas.width, pheromoneCanvas.height);
}

optimizeBtn.addEventListener('click', startOptimization);
stopBtn.addEventListener('click', stopOptimization);
newCitiesBtn.addEventListener('click', newCities);
resetBtn.addEventListener('click', reset);
reset();
