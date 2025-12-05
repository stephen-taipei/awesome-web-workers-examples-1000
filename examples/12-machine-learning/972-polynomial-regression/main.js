const genDataBtn = document.getElementById('genDataBtn');
const trainBtn = document.getElementById('trainBtn');
const stopBtn = document.getElementById('stopBtn');
const degreeInput = document.getElementById('degree');
const learningRateInput = document.getElementById('learningRate');

const degreeDisplay = document.getElementById('degreeDisplay');
const lrDisplay = document.getElementById('lrDisplay');
const epochDisplay = document.getElementById('epochDisplay');
const lossDisplay = document.getElementById('lossDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('polyCanvas');
const ctx = canvas.getContext('2d');

let worker;
let currentData = [];

degreeInput.addEventListener('input', () => degreeDisplay.textContent = degreeInput.value);
learningRateInput.addEventListener('input', () => lrDisplay.textContent = learningRateInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'data') {
            currentData = data;
            draw(data, null);
            statusText.textContent = 'Data Generated';
            trainBtn.disabled = false;
        } else if (type === 'epoch') {
            epochDisplay.textContent = data.epoch;
            lossDisplay.textContent = data.loss.toFixed(5);
            draw(currentData, data.weights);
        } else if (type === 'done') {
            statusText.textContent = 'Converged / Stopped';
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
    stopBtn.disabled = true;
    
    worker.postMessage({
        command: 'generate'
    });
});

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const degree = parseInt(degreeInput.value);
    const lr = parseFloat(learningRateInput.value);

    trainBtn.disabled = true;
    genDataBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Training...';

    worker.postMessage({
        command: 'train',
        degree,
        learningRate: lr
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

function draw(points, weights) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Map coordinate system
    // X: 0..1 -> 0..w
    // Y: -1.5..1.5 -> h..0 (flip Y)
    
    const mapX = (x) => x * w;
    const mapY = (y) => h/2 - y * (h/3); // Center 0 at h/2

    // Axes
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mapY(0));
    ctx.lineTo(w, mapY(0));
    ctx.stroke();

    // Points
    ctx.fillStyle = '#757575';
    for (let p of points) {
        ctx.beginPath();
        ctx.arc(mapX(p.x), mapY(p.y), 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Curve
    if (weights) {
        ctx.strokeStyle = '#ef6c00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let px = 0; px <= w; px += 5) {
            const x = px / w;
            // Predict y = w0 + w1*x + w2*x^2 ...
            let y = 0;
            for (let d = 0; d < weights.length; d++) {
                y += weights[d] * Math.pow(x, d);
            }
            
            const py = mapY(y);
            if (px === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
}

initWorker();
genDataBtn.click();
