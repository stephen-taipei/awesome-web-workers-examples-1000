const startBtn = document.getElementById('startBtn');
const statusDiv = document.getElementById('status');
const objCanvas = document.getElementById('objChart');
const resCanvas = document.getElementById('resChart');
const weightsCanvas = document.getElementById('weightsChart');

let worker;
let objHistory = [];
let rHistory = [];
let sHistory = [];
let trueWeights = [];
let estimatedWeights = [];

let objCtx = objCanvas.getContext('2d');
let resCtx = resCanvas.getContext('2d');
let weightsCtx = weightsCanvas.getContext('2d');

function initCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.getContext('2d').scale(dpr, dpr);
}

initCanvas(objCanvas);
initCanvas(resCanvas);
initCanvas(weightsCanvas);

startBtn.addEventListener('click', () => {
    if (worker) worker.terminate();

    const N = parseInt(document.getElementById('samples').value);
    const D = parseInt(document.getElementById('features').value);
    const sparsity = parseFloat(document.getElementById('sparsity').value);
    const lambda = parseFloat(document.getElementById('lambda').value);
    const rho = parseFloat(document.getElementById('rho').value);
    const iterations = parseInt(document.getElementById('iterations').value);

    worker = new Worker('worker.js');

    statusDiv.textContent = 'Running ADMM...';
    statusDiv.className = 'status-running';
    startBtn.disabled = true;

    objHistory = [];
    rHistory = [];
    sHistory = [];

    worker.postMessage({
        type: 'start',
        data: { N, D, sparsity, lambda, rho, iterations }
    });

    worker.onmessage = function(e) {
        const { type } = e.data;
        if (type === 'data') {
            trueWeights = e.data.x_true;
            drawWeights(trueWeights, new Float32Array(trueWeights.length).fill(0));
        } else if (type === 'progress') {
            objHistory.push(e.data.obj);
            rHistory.push(e.data.r_norm);
            sHistory.push(e.data.s_norm);
            estimatedWeights = e.data.x;

            drawObj(objHistory);
            drawResiduals(rHistory, sHistory);
            if (e.data.iteration % 10 === 0) drawWeights(trueWeights, estimatedWeights);
        } else if (type === 'done') {
            estimatedWeights = e.data.x;
            drawWeights(trueWeights, estimatedWeights);
            statusDiv.textContent = 'Optimization Complete';
            statusDiv.className = 'status-done';
            startBtn.disabled = false;
        }
    };

    worker.onerror = (err) => {
        statusDiv.textContent = 'Error: ' + err.message;
        statusDiv.className = 'status-error';
        startBtn.disabled = false;
    };
});

function drawObj(history) {
    const width = objCanvas.width / (window.devicePixelRatio || 1);
    const height = objCanvas.height / (window.devicePixelRatio || 1);
    const ctx = objCtx;

    ctx.clearRect(0, 0, width, height);
    if (!history.length) return;

    ctx.beginPath();
    ctx.strokeStyle = '#28a745';
    ctx.lineWidth = 2;

    const maxVal = Math.max(...history);
    const minVal = Math.min(...history);
    const range = maxVal - minVal || 1;

    for (let i = 0; i < history.length; i++) {
        const x = (i / (history.length - 1)) * width;
        const y = height - ((history[i] - minVal) / range) * (height - 20) - 10;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.fillText(`Obj: ${history[history.length-1].toFixed(4)}`, 10, 20);
}

function drawResiduals(rHist, sHist) {
    const width = resCanvas.width / (window.devicePixelRatio || 1);
    const height = resCanvas.height / (window.devicePixelRatio || 1);
    const ctx = resCtx;

    ctx.clearRect(0, 0, width, height);
    if (!rHist.length) return;

    // Log scale usually better for residuals, but linear for simplicity here
    const maxVal = Math.max(...rHist, ...sHist) || 1;

    // Draw Primal (Blue)
    ctx.beginPath();
    ctx.strokeStyle = '#007bff';
    for(let i=0; i<rHist.length; i++) {
        const x = (i/(rHist.length-1)) * width;
        const y = height - (rHist[i]/maxVal) * (height-20) - 10;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // Draw Dual (Red)
    ctx.beginPath();
    ctx.strokeStyle = '#dc3545';
    for(let i=0; i<sHist.length; i++) {
        const x = (i/(sHist.length-1)) * width;
        const y = height - (sHist[i]/maxVal) * (height-20) - 10;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    ctx.fillStyle = '#007bff';
    ctx.fillText('Primal Residual', 10, 20);
    ctx.fillStyle = '#dc3545';
    ctx.fillText('Dual Residual', 10, 35);
}

function drawWeights(trueW, estW) {
    const width = weightsCanvas.width / (window.devicePixelRatio || 1);
    const height = weightsCanvas.height / (window.devicePixelRatio || 1);
    const ctx = weightsCtx;
    const D = trueW.length;

    ctx.clearRect(0, 0, width, height);
    const barWidth = width / D;
    const maxVal = Math.max(...trueW.map(Math.abs), ...estW.map(Math.abs)) || 1;

    for (let i = 0; i < D; i++) {
        const x = i * barWidth;
        const cy = height/2;

        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x+1, cy, barWidth-2, -(trueW[i]/maxVal)*(height/2-10));

        ctx.fillStyle = '#28a745';
        ctx.fillRect(x+2, cy, barWidth-4, -(estW[i]/maxVal)*(height/2-10));
    }

    ctx.strokeStyle = '#ccc';
    ctx.beginPath(); ctx.moveTo(0, height/2); ctx.lineTo(width, height/2); ctx.stroke();
}

window.addEventListener('resize', () => {
    initCanvas(objCanvas); initCanvas(resCanvas); initCanvas(weightsCanvas);
    drawObj(objHistory); drawResiduals(rHistory, sHistory); drawWeights(trueWeights, estimatedWeights);
});
