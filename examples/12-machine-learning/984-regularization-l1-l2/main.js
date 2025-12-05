const trainBtn = document.getElementById('trainBtn');
const stopBtn = document.getElementById('stopBtn');
const polynomialDegreeInput = document.getElementById('polynomialDegree');
const lambdaInput = document.getElementById('lambda');
const learningRateInput = document.getElementById('learningRate');

const degreeDisplay = document.getElementById('degreeDisplay');
const lambdaDisplay = document.getElementById('lambdaDisplay');
const lrDisplay = document.getElementById('lrDisplay');
const iterDisplay = document.getElementById('iterDisplay');
const trainLossDisplay = document.getElementById('trainLossDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('regCanvas');
const ctx = canvas.getContext('2d');

let worker;

// Update sliders
polynomialDegreeInput.addEventListener('input', () => degreeDisplay.textContent = polynomialDegreeInput.value);
lambdaInput.addEventListener('input', () => lambdaDisplay.textContent = lambdaInput.value);
learningRateInput.addEventListener('input', () => lrDisplay.textContent = learningRateInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'step') {
            iterDisplay.textContent = data.iteration;
            trainLossDisplay.textContent = data.loss.toFixed(4);
            drawChart(data.points, data.weights, data.degree);
        } else if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'done') {
            statusText.textContent = 'Stopped / Converged';
            trainBtn.disabled = false;
            stopBtn.disabled = true;
        }
    };
}

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const degree = parseInt(polynomialDegreeInput.value);
    const lambda = parseFloat(lambdaInput.value);
    const lr = parseFloat(learningRateInput.value);
    const regType = document.querySelector('input[name="regType"]:checked').value;

    trainBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Training...';
    
    worker.postMessage({
        command: 'start',
        degree,
        lambda,
        learningRate: lr,
        regType
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

function drawChart(points, weights, degree) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Coordinate system: X [0, 1] -> Canvas X, Y [-1.5, 1.5] -> Canvas Y
    const mapX = (x) => x * w;
    const mapY = (y) => h/2 - y * (h/3); // Center Y=0 at h/2

    // Draw Axes
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mapY(0));
    ctx.lineTo(w, mapY(0));
    ctx.stroke();

    // Draw Data Points
    ctx.fillStyle = '#333';
    for (let p of points) {
        ctx.beginPath();
        ctx.arc(mapX(p.x), mapY(p.y), 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw Fitted Curve
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let x = 0; x <= 1; x += 0.01) {
        // Compute predictions y = w0 + w1*x + w2*x^2 ...
        let y = 0;
        for (let d = 0; d <= degree; d++) {
            y += weights[d] * Math.pow(x, d);
        }
        
        const cx = mapX(x);
        const cy = mapY(y);
        
        if (x === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
}

initWorker();
