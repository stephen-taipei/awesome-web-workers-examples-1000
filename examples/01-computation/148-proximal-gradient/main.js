const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
const lossCanvas = document.getElementById('lossChart');
const weightsCanvas = document.getElementById('weightsChart');

let worker;
let lossHistory = [];
let trueWeights = [];
let estimatedWeights = [];
let lossCtx = lossCanvas.getContext('2d');
let weightsCtx = weightsCanvas.getContext('2d');

function initCanvas(canvas) {
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.getContext('2d').scale(dpr, dpr);
}

// Initial setup
initCanvas(lossCanvas);
initCanvas(weightsCanvas);

startBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
    }

    const N = parseInt(document.getElementById('samples').value);
    const D = parseInt(document.getElementById('features').value);
    const sparsity = parseFloat(document.getElementById('sparsity').value);
    const lambda = parseFloat(document.getElementById('lambda').value);
    const learningRate = parseFloat(document.getElementById('learningRate').value);
    const iterations = parseInt(document.getElementById('iterations').value);

    worker = new Worker('worker.js');

    statusDiv.textContent = 'Running...';
    statusDiv.className = 'status-running';
    startBtn.disabled = true;

    lossHistory = [];

    worker.postMessage({
        type: 'start',
        data: { N, D, sparsity, lambda, learningRate, iterations }
    });

    worker.onmessage = function(e) {
        const { type } = e.data;

        if (type === 'data') {
            trueWeights = e.data.w_true;
            drawWeights(trueWeights, new Float32Array(trueWeights.length).fill(0));
        } else if (type === 'progress') {
            lossHistory.push(e.data.loss);
            estimatedWeights = e.data.w;
            drawLoss(lossHistory);
            if (e.data.iteration % 10 === 0) { // Update weights chart less frequently
                drawWeights(trueWeights, estimatedWeights);
            }
        } else if (type === 'done') {
            estimatedWeights = e.data.w;
            drawWeights(trueWeights, estimatedWeights);
            statusDiv.textContent = 'Optimization Complete';
            statusDiv.className = 'status-done';
            startBtn.disabled = false;
        }
    };

    worker.onerror = function(error) {
        statusDiv.textContent = 'Error: ' + error.message;
        statusDiv.className = 'status-error';
        startBtn.disabled = false;
    };
});

function drawLoss(history) {
    const width = lossCanvas.width / (window.devicePixelRatio || 1);
    const height = lossCanvas.height / (window.devicePixelRatio || 1);
    const ctx = lossCtx;

    ctx.clearRect(0, 0, width, height);

    if (history.length === 0) return;

    ctx.beginPath();
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;

    const maxLoss = Math.max(...history);
    const minLoss = Math.min(...history);
    const range = maxLoss - minLoss || 1;

    for (let i = 0; i < history.length; i++) {
        const x = (i / (history.length - 1)) * width;
        const y = height - ((history[i] - minLoss) / range) * (height - 20) - 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Text
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Iter: ${history.length}`, 10, 20);
    ctx.fillText(`Loss: ${history[history.length - 1].toFixed(4)}`, 10, 35);
}

function drawWeights(trueW, estW) {
    const width = weightsCanvas.width / (window.devicePixelRatio || 1);
    const height = weightsCanvas.height / (window.devicePixelRatio || 1);
    const ctx = weightsCtx;
    const D = trueW.length;

    ctx.clearRect(0, 0, width, height);

    const barWidth = width / D;
    const maxVal = Math.max(
        ...trueW.map(Math.abs),
        ...Array.from(estW).map(Math.abs)
    ) || 1;

    for (let i = 0; i < D; i++) {
        const x = i * barWidth;
        const centerY = height / 2;

        // Draw true weight (Background, semi-transparent)
        const hTrue = (trueW[i] / maxVal) * (height / 2 - 10);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(x + 1, centerY, barWidth - 2, -hTrue);

        // Draw estimated weight (Foreground)
        const hEst = (estW[i] / maxVal) * (height / 2 - 10);
        ctx.fillStyle = '#28a745'; // Green
        ctx.fillRect(x + 2, centerY, barWidth - 4, -hEst);
    }

    // Zero line
    ctx.beginPath();
    ctx.strokeStyle = '#ccc';
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Legend
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(10, 10, 10, 10);
    ctx.fillStyle = '#333';
    ctx.fillText('True Weights', 25, 20);

    ctx.fillStyle = '#28a745';
    ctx.fillRect(10, 25, 10, 10);
    ctx.fillStyle = '#333';
    ctx.fillText('Est. Weights', 25, 35);
}

// Handle resize
window.addEventListener('resize', () => {
    initCanvas(lossCanvas);
    initCanvas(weightsCanvas);
    drawLoss(lossHistory);
    drawWeights(trueWeights, estimatedWeights);
});
