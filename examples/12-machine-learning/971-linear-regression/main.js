const genDataBtn = document.getElementById('genDataBtn');
const trainBtn = document.getElementById('trainBtn');
const stopBtn = document.getElementById('stopBtn');
const pointCountSelect = document.getElementById('pointCount');
const noiseInput = document.getElementById('noise');
const learningRateInput = document.getElementById('learningRate');

const noiseDisplay = document.getElementById('noiseDisplay');
const lrDisplay = document.getElementById('lrDisplay');
const epochDisplay = document.getElementById('epochDisplay');
const lossDisplay = document.getElementById('lossDisplay');
const weightsDisplay = document.getElementById('weightsDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('lrCanvas');
const ctx = canvas.getContext('2d');

let worker;
let currentData = [];

noiseInput.addEventListener('input', () => noiseDisplay.textContent = noiseInput.value);
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
            weightsDisplay.textContent = `m=${data.m.toFixed(2)}, b=${data.b.toFixed(2)}`;
            draw(currentData, { m: data.m, b: data.b });
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
    
    const count = parseInt(pointCountSelect.value);
    const noise = parseInt(noiseInput.value);

    statusText.textContent = 'Generating...';
    trainBtn.disabled = true;
    stopBtn.disabled = true;
    epochDisplay.textContent = '0';
    lossDisplay.textContent = '-';
    
    worker.postMessage({
        command: 'generate',
        count,
        noise
    });
});

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const lr = parseFloat(learningRateInput.value);

    trainBtn.disabled = true;
    genDataBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Training...';

    worker.postMessage({
        command: 'train',
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

function draw(points, model) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Coordinate Mapping
    // x: 0..1 -> 0..w
    // y: 0..1 -> h..0 (flip)
    
    const mapX = (x) => x * w;
    const mapY = (y) => h - y * h;

    // Draw Axes
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mapY(0)); // x-axis
    ctx.lineTo(w, mapY(0));
    ctx.moveTo(mapX(0), 0); // y-axis
    ctx.lineTo(mapX(0), h);
    ctx.stroke();

    // Draw Points
    ctx.fillStyle = '#1976d2';
    for (let p of points) {
        ctx.beginPath();
        ctx.arc(mapX(p.x), mapY(p.y), 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw Line
    if (model) {
        ctx.strokeStyle = '#d84315'; // Orange-ish
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const x1 = 0;
        const y1 = model.m * x1 + model.b;
        const x2 = 1;
        const y2 = model.m * x2 + model.b;
        
        ctx.moveTo(mapX(x1), mapY(y1));
        ctx.lineTo(mapX(x2), mapY(y2));
        ctx.stroke();
    }
}

initWorker();
genDataBtn.click();
