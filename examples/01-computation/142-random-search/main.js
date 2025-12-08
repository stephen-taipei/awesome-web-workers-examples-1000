// Random Search - Main Thread

const functionSelect = document.getElementById('functionSelect');
const sampleCountInput = document.getElementById('sampleCount');
const batchSizeInput = document.getElementById('batchSize');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');

const statusSection = document.getElementById('statusSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const evalCountEl = document.getElementById('evalCount');

const canvas = document.getElementById('plotCanvas');
const ctx = canvas.getContext('2d');

const resultSection = document.getElementById('resultSection');
const bestXEl = document.getElementById('bestX');
const bestYEl = document.getElementById('bestY');
const minValEl = document.getElementById('minVal');
const logContainer = document.getElementById('logContainer');

let worker = null;
let isRunning = false;

// Function definitions for display/plotting (Worker has its own)
const functions = {
    rastrigin: {
        xRange: [-5.12, 5.12],
        yRange: [-5.12, 5.12],
        zMin: 0, zMax: 80 // Approx for coloring
    },
    ackley: {
        xRange: [-5, 5],
        yRange: [-5, 5],
        zMin: 0, zMax: 22
    },
    schwefel: {
        xRange: [-500, 500],
        yRange: [-500, 500],
        zMin: 0, zMax: 1000 // Shifted so min is 0
    },
    michalewicz: {
        xRange: [0, Math.PI],
        yRange: [0, Math.PI],
        zMin: -1.8, zMax: 0
    }
};

let currentSamples = [];
let currentBest = null;

startBtn.addEventListener('click', startSearch);
stopBtn.addEventListener('click', stopSearch);
clearBtn.addEventListener('click', clearResults);
functionSelect.addEventListener('change', () => {
    clearResults();
    drawBackground();
});

function startSearch() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = handleWorkerMessage;

    const funcName = functionSelect.value;
    const count = parseInt(sampleCountInput.value);
    const batch = parseInt(batchSizeInput.value);

    currentSamples = [];
    currentBest = null;
    logContainer.innerHTML = '';

    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusSection.classList.remove('hidden');
    resultSection.classList.remove('hidden');
    isRunning = true;

    drawBackground();

    worker.postMessage({
        type: 'start',
        funcName,
        count,
        batchSize: batch
    });
}

function stopSearch() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

function clearResults() {
    stopSearch();
    currentSamples = [];
    currentBest = null;
    statusSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    logContainer.innerHTML = '';
    drawBackground();
}

function handleWorkerMessage(e) {
    const data = e.data;

    if (data.type === 'progress' || data.type === 'result') {
        // Update progress
        const percent = (data.completed / data.total * 100).toFixed(1);
        progressBar.style.width = percent + '%';
        progressText.textContent = percent + '%';
        evalCountEl.textContent = `${data.completed} / ${data.total} samples`;

        // Add new samples
        if (data.samples && data.samples.length > 0) {
            currentSamples.push(...data.samples);
        }

        // Check for new best
        if (data.best) {
            const newBest = data.best;
            if (!currentBest || newBest.val < currentBest.val) {
                updateBest(newBest, data.completed);
            }
        }

        drawSamples();

        if (data.type === 'result') {
            stopSearch();
        }
    }
}

function updateBest(best, iter) {
    currentBest = best;
    bestXEl.textContent = best.x.toFixed(6);
    bestYEl.textContent = best.y.toFixed(6);
    minValEl.textContent = best.val.toFixed(6);

    const entry = document.createElement('div');
    entry.className = 'log-entry new-best';
    entry.textContent = `Iter ${iter}: Found new min ${best.val.toFixed(6)}`;
    logContainer.insertBefore(entry, logContainer.firstChild);
}

// Visualization
function drawBackground() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const func = functions[functionSelect.value];
    const { xRange, yRange } = func;

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Simple 4x4 grid
    for(let i=1; i<4; i++) {
        const x = i * canvas.width / 4;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);

        const y = i * canvas.height / 4;
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.fillText(`${xRange[0]}`, 2, canvas.height - 2);
    ctx.fillText(`${xRange[1]}`, canvas.width - 25, canvas.height - 2);
    ctx.fillText(`${yRange[0]}`, 2, canvas.height - 14);
    ctx.fillText(`${yRange[1]}`, 2, 10);
}

function drawSamples() {
    drawBackground();

    const func = functions[functionSelect.value];
    const { xRange, yRange } = func;
    const w = canvas.width;
    const h = canvas.height;

    const mapX = (x) => ((x - xRange[0]) / (xRange[1] - xRange[0])) * w;
    const mapY = (y) => h - ((y - yRange[0]) / (yRange[1] - yRange[0])) * h;

    // Draw all samples as small red dots
    ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'; // Red-500
    for(const s of currentSamples) {
        ctx.beginPath();
        ctx.arc(mapX(s.x), mapY(s.y), 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw best as large green cross
    if (currentBest) {
        const bx = mapX(currentBest.x);
        const by = mapY(currentBest.y);

        ctx.strokeStyle = '#34d399'; // Green-400
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx - 6, by - 6);
        ctx.lineTo(bx + 6, by + 6);
        ctx.moveTo(bx + 6, by - 6);
        ctx.lineTo(bx - 6, by + 6);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(bx, by, 8, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Initial draw
drawBackground();
