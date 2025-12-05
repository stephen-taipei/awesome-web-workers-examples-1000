const genDataBtn = document.getElementById('genDataBtn');
const trainBtn = document.getElementById('trainBtn');
const stopBtn = document.getElementById('stopBtn');
const learningRateInput = document.getElementById('learningRate');
const epochsInput = document.getElementById('epochs');

const lrDisplay = document.getElementById('lrDisplay');
const epochDisplay = document.getElementById('epochDisplay');
const lossDisplay = document.getElementById('lossDisplay');
const accDisplay = document.getElementById('accDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('lrCanvas');
const ctx = canvas.getContext('2d');

let worker;
let currentData = [];
const colors = ['#ff5252', '#304ffe']; // Red (0), Blue (1)

learningRateInput.addEventListener('input', () => lrDisplay.textContent = learningRateInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'data') {
            currentData = data;
            drawPoints(data);
            statusText.textContent = 'Data Ready';
            trainBtn.disabled = false;
        } else if (type === 'step') {
            epochDisplay.textContent = data.epoch;
            lossDisplay.textContent = data.loss.toFixed(4);
            accDisplay.textContent = (data.accuracy * 100).toFixed(1) + '%';
            
            drawState(data.weights, data.bias);
        } else if (type === 'done') {
            statusText.textContent = 'Converged / Finished';
            trainBtn.disabled = false;
            stopBtn.disabled = true;
            genDataBtn.disabled = false;
        }
    };
}

genDataBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    statusText.textContent = 'Generating...';
    trainBtn.disabled = true;
    accDisplay.textContent = '-';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    worker.postMessage({
        command: 'generate',
        width: canvas.width,
        height: canvas.height
    });
});

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const lr = parseFloat(learningRateInput.value);
    const epochs = parseInt(epochsInput.value);

    trainBtn.disabled = true;
    genDataBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Training...';

    worker.postMessage({
        command: 'train',
        learningRate: lr,
        epochs
    });
});

stopBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        statusText.textContent = 'Stopped';
        trainBtn.disabled = false;
        stopBtn.disabled = true;
        genDataBtn.disabled = false;
        worker = null;
    }
});

function drawPoints(points) {
    for (let p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = colors[p.label];
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
    }
}

function drawState(w, b) {
    // Draw Background Heatmap (Probability)
    // Logistic Function: P = 1 / (1 + exp(-(w0*x + w1*y + b)))
    // We want to visualize P over the canvas.
    // Optimization: Don't draw every pixel, draw low res and scale? 
    // Or just draw decision boundary line for speed + gradient.
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // 1. Draw Decision Boundary Line
    // w0*x + w1*y + b = 0 => y = (-w0*x - b) / w1
    
    // Also visualize probability gradient?
    // Let's do a simple gradient fill
    // Linear gradient direction is vector (w0, w1)
    
    // Start/End points of canvas projection onto normal vector?
    // Easier: Draw pixel map at low res (e.g. 50x50) and stretch
    const gridSize = 50;
    const imgData = ctx.createImageData(gridSize, gridSize);
    const d = imgData.data;
    
    for(let r=0; r<gridSize; r++) {
        for(let c=0; c<gridSize; c++) {
            const x = c / gridSize * width;
            const y = r / gridSize * height;
            
            const z = w.w0 * x + w.w1 * y + b;
            const p = 1 / (1 + Math.exp(-z)); // Sigmoid
            
            const idx = (r * gridSize + c) * 4;
            
            // Interpolate Red (0) to Blue (1) via White (0.5)
            // Or Light Red to Light Blue
            if (p < 0.5) {
                // Reddish
                const intensity = (0.5 - p) * 2; // 0 to 1
                d[idx] = 255;
                d[idx+1] = 255 * (1 - intensity * 0.3); // tint
                d[idx+2] = 255 * (1 - intensity * 0.3);
            } else {
                // Bluish
                const intensity = (p - 0.5) * 2;
                d[idx] = 255 * (1 - intensity * 0.3);
                d[idx+1] = 255 * (1 - intensity * 0.3);
                d[idx+2] = 255;
            }
            d[idx+3] = 150; // Alpha
        }
    }
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = gridSize;
    tempCanvas.height = gridSize;
    tempCanvas.getContext('2d').putImageData(imgData, 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, width, height);
    
    // Draw Boundary Line
    if (Math.abs(w.w1) > 1e-5) {
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        const x1 = 0;
        const y1 = (-w.w0 * x1 - b) / w.w1;
        const x2 = width;
        const y2 = (-w.w0 * x2 - b) / w.w1;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    drawPoints(currentData);
}

initWorker();
genDataBtn.click();
