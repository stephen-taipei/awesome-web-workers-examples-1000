const newDataBtn = document.getElementById('newDataBtn');
const trainBtn = document.getElementById('trainBtn');
const stopBtn = document.getElementById('stopBtn');
const learningRateInput = document.getElementById('learningRate');
const lrDisplay = document.getElementById('lrDisplay');
const epochDisplay = document.getElementById('epochDisplay');
const accDisplay = document.getElementById('accDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('pCanvas');
const ctx = canvas.getContext('2d');

let worker;
let currentData = [];
let weights = { w0: 0, w1: 0, bias: 0 };

learningRateInput.addEventListener('input', () => lrDisplay.textContent = learningRateInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'data') {
            currentData = data;
            // Reset weights visual
            weights = { w0: 0, w1: 0, bias: 0 };
            draw();
            statusText.textContent = 'Data Generated';
            trainBtn.disabled = false;
        } else if (type === 'epoch') {
            weights = data.weights;
            epochDisplay.textContent = data.epoch;
            accDisplay.textContent = (data.accuracy * 100).toFixed(1) + '%';
            draw();
        } else if (type === 'done') {
            statusText.textContent = 'Converged / Finished';
            trainBtn.disabled = false;
            stopBtn.disabled = true;
            newDataBtn.disabled = false;
        }
    };
}

function generateData() {
    if (!worker) initWorker();
    statusText.textContent = 'Generating...';
    trainBtn.disabled = true;
    stopBtn.disabled = true;
    epochDisplay.textContent = '0';
    accDisplay.textContent = '0%';
    
    worker.postMessage({
        command: 'generate',
        width: canvas.width,
        height: canvas.height
    });
}

newDataBtn.addEventListener('click', generateData);

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker(); // Should be active, but just in case
    
    const lr = parseFloat(learningRateInput.value);
    const delay = parseInt(document.querySelector('input[name="speed"]:checked').value);

    trainBtn.disabled = true;
    newDataBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Training...';

    worker.postMessage({
        command: 'train',
        learningRate: lr,
        delay: delay
    });
});

stopBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        statusText.textContent = 'Stopped';
        trainBtn.disabled = false;
        stopBtn.disabled = true;
        newDataBtn.disabled = false;
        worker = null;
    }
});

function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw Data
    for (let p of currentData) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = p.label === 1 ? '#2196f3' : '#f44336';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Draw Decision Boundary
    // w0*x + w1*y + bias = 0
    // y = (-w0*x - bias) / w1
    
    if (weights.w1 !== 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        
        // Calculate two points at edges of canvas
        const x1 = 0;
        const y1 = (-weights.w0 * x1 - weights.bias) / weights.w1;
        
        const x2 = w;
        const y2 = (-weights.w0 * x2 - weights.bias) / weights.w1;
        
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

// Initial load
initWorker();
generateData();
