const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const pointCountSelect = document.getElementById('pointCount');
const clusterCountInput = document.getElementById('clusterCount');
const kDisplay = document.getElementById('kDisplay');
const iterDisplay = document.getElementById('iterDisplay');
const llDisplay = document.getElementById('llDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('gmmCanvas');
const ctx = canvas.getContext('2d');

let worker;
const colors = ['#e57373', '#81c784', '#64b5f6', '#ffd54f', '#ba68c8', '#4db6ac'];

clusterCountInput.addEventListener('input', () => kDisplay.textContent = clusterCountInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'update') {
            iterDisplay.textContent = data.iteration;
            llDisplay.textContent = data.logLikelihood.toFixed(2);
            drawGMM(data.points, data.gaussians, data.assignments);
        } else if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'done') {
            statusText.textContent = 'Converged / Stopped';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const points = parseInt(pointCountSelect.value);
    const k = parseInt(clusterCountInput.value);
    const speed = parseInt(document.querySelector('input[name="speed"]:checked').value);

    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Generating Data...';
    iterDisplay.textContent = '0';
    llDisplay.textContent = '-';

    worker.postMessage({
        command: 'start',
        points,
        k,
        delay: speed,
        width: canvas.width,
        height: canvas.height
    });
});

stopBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        statusText.textContent = 'Terminated';
        startBtn.disabled = false;
        stopBtn.disabled = true;
        worker = null;
    }
});

function drawGMM(points, gaussians, assignments) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw Points
    // We can color them by hard assignment (argmax of responsibilities)
    for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i+1];
        const clusterIdx = assignments[i/2];
        
        ctx.fillStyle = colors[clusterIdx % colors.length];
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw Gaussians (Ellipses)
    gaussians.forEach((g, idx) => {
        const color = colors[idx % colors.length];
        drawEllipse(g.mu[0], g.mu[1], g.sigma, color);
    });
}

function drawEllipse(x, y, covariance, color) {
    // Eigen decomposition of 2x2 symmetric matrix
    // [ a  b ]
    // [ b  c ]
    const a = covariance[0];
    const b = covariance[1];
    const c = covariance[3];

    // Calculate eigenvalues
    const term1 = (a + c) / 2;
    const term2 = Math.sqrt(Math.pow((a - c) / 2, 2) + b * b);
    const lambda1 = term1 + term2;
    const lambda2 = term1 - term2;

    // Calculate angle of major axis
    // theta = 0.5 * atan2(2b, a - c)
    let theta = 0;
    if (b === 0 && a >= c) theta = 0;
    else if (b === 0 && a < c) theta = Math.PI / 2;
    else {
        theta = 0.5 * Math.atan2(2 * b, a - c);
    }

    // Radii for 2 standard deviations (approx 95%)
    // Radius ~ sqrt(lambda) * scale
    // Chi-squared value for 95% confidence in 2D is ~5.99. Sqrt(5.99) ~ 2.45
    const scale = 2.0; 
    const r1 = Math.sqrt(Math.max(0, lambda1)) * scale;
    const r2 = Math.sqrt(Math.max(0, lambda2)) * scale;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.ellipse(x, y, r1, r2, theta, 0, 2 * Math.PI);
    ctx.stroke();

    // Center
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
}

initWorker();
