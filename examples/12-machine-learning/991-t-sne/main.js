const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const pointCountSelect = document.getElementById('pointCount');
const perplexityInput = document.getElementById('perplexity');
const iterationsInput = document.getElementById('iterations');
const epsilonInput = document.getElementById('epsilon');

const perpDisplay = document.getElementById('perpDisplay');
const iterDisplay = document.getElementById('iterDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('tsneCanvas');
const ctx = canvas.getContext('2d');

let worker;
let colors = [];

perplexityInput.addEventListener('input', () => perpDisplay.textContent = perplexityInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'progress') {
            iterDisplay.textContent = data.iter;
            drawPoints(data.solution, data.labels);
        } else if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'done') {
            statusText.textContent = 'Completed';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const points = parseInt(pointCountSelect.value);
    const perplexity = parseInt(perplexityInput.value);
    const iterations = parseInt(iterationsInput.value);
    const epsilon = parseInt(epsilonInput.value);

    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Generating Data...';
    iterDisplay.textContent = '0';
    
    // Generate colors for clusters (we'll assume 3 clusters for demo)
    // Actually worker generates labels.
    
    worker.postMessage({
        command: 'start',
        points,
        perplexity,
        iterations,
        epsilon
    });
});

stopBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        statusText.textContent = 'Stopped';
        startBtn.disabled = false;
        stopBtn.disabled = true;
        worker = null;
    }
});

function drawPoints(solution, labels) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Normalize solution to fit canvas
    // Flattened array [x0, y0, x1, y1, ...]
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < solution.length; i += 2) {
        if (solution[i] < minX) minX = solution[i];
        if (solution[i] > maxX) maxX = solution[i];
        if (solution[i+1] < minY) minY = solution[i+1];
        if (solution[i+1] > maxY) maxY = solution[i+1];
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 20;
    const scaleX = (w - 2*padding) / rangeX;
    const scaleY = (h - 2*padding) / rangeY;

    // Define colors for labels (0, 1, 2)
    const clusterColors = ['#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#2ecc71'];

    for (let i = 0; i < solution.length; i += 2) {
        const x = padding + (solution[i] - minX) * scaleX;
        const y = padding + (solution[i+1] - minY) * scaleY;
        const label = labels[i/2];

        ctx.fillStyle = clusterColors[label % clusterColors.length];
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

initWorker();
