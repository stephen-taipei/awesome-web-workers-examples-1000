const trainBtn = document.getElementById('trainBtn');
const stopBtn = document.getElementById('stopBtn');
const nEstimatorsInput = document.getElementById('nEstimators');
const learningRateInput = document.getElementById('learningRate');
const noiseInput = document.getElementById('noise');

const estDisplay = document.getElementById('estDisplay');
const lrDisplay = document.getElementById('lrDisplay');
const noiseDisplay = document.getElementById('noiseDisplay');
const treeCount = document.getElementById('treeCount');
const lossDisplay = document.getElementById('lossDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('gbmCanvas');
const ctx = canvas.getContext('2d');

let worker;

nEstimatorsInput.addEventListener('input', () => estDisplay.textContent = nEstimatorsInput.value);
learningRateInput.addEventListener('input', () => lrDisplay.textContent = learningRateInput.value);
noiseInput.addEventListener('input', () => noiseDisplay.textContent = noiseInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'update') {
            treeCount.textContent = data.trees;
            lossDisplay.textContent = data.loss.toFixed(5);
            drawChart(data.points, data.prediction);
        } else if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'done') {
            statusText.textContent = 'Finished';
            trainBtn.disabled = false;
            stopBtn.disabled = true;
        }
    };
}

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const nEstimators = parseInt(nEstimatorsInput.value);
    const learningRate = parseFloat(learningRateInput.value);
    const noise = parseFloat(noiseInput.value);

    trainBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Generating Data...';
    treeCount.textContent = '0';
    
    worker.postMessage({
        command: 'start',
        nEstimators,
        learningRate,
        noise
    });
});

stopBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        statusText.textContent = 'Stopped';
        trainBtn.disabled = false;
        stopBtn.disabled = true;
        worker = null;
    }
});

function drawChart(points, prediction) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Map X[0..1] -> Canvas X
    // Map Y[-1.5..1.5] -> Canvas Y
    const mapX = x => x * w;
    const mapY = y => h/2 - y * (h/3);

    // Draw Axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mapY(0));
    ctx.lineTo(w, mapY(0));
    ctx.stroke();

    // Draw Data
    ctx.fillStyle = '#aaa';
    for (let p of points) {
        ctx.beginPath();
        ctx.arc(mapX(p.x), mapY(p.y), 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw Prediction Line
    // Prediction is array of {x, y} sorted by x usually, or we sort.
    // Worker sends sorted x for line drawing convenience.
    
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let i = 0; i < prediction.length; i++) {
        const p = prediction[i];
        const px = mapX(p.x);
        const py = mapY(p.y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
}

initWorker();
