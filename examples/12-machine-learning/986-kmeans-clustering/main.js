const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const pointCountSelect = document.getElementById('pointCount');
const kValueInput = document.getElementById('kValue');
const initMethodSelect = document.getElementById('initMethod');
const kDisplay = document.getElementById('kDisplay');
const iterDisplay = document.getElementById('iterDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('kmeansCanvas');
const ctx = canvas.getContext('2d');

let worker;
const colors = ['#ff1744', '#00e676', '#2979ff', '#ffea00', '#aa00ff', '#ff9100', '#00b0ff', '#f50057', '#76ff03', '#651fff'];

kValueInput.addEventListener('input', () => kDisplay.textContent = kValueInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'step') {
            iterDisplay.textContent = data.iteration;
            drawState(data.points, data.assignments, data.centroids);
        } else if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'done') {
            statusText.textContent = 'Converged';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const points = parseInt(pointCountSelect.value);
    const k = parseInt(kValueInput.value);
    const method = initMethodSelect.value;
    const speed = parseInt(document.querySelector('input[name="speed"]:checked').value);

    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Initializing...';
    iterDisplay.textContent = '0';

    worker.postMessage({
        command: 'start',
        points,
        k,
        method,
        delay: speed,
        width: canvas.width,
        height: canvas.height
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

function drawState(points, assignments, centroids) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw points
    for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i+1];
        const clusterIdx = assignments[i/2];
        
        ctx.fillStyle = clusterIdx === -1 ? '#555' : colors[clusterIdx % colors.length];
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw centroids
    for (let i = 0; i < centroids.length; i++) {
        const x = centroids[i].x;
        const y = centroids[i].y;
        const color = colors[i % colors.length];

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.stroke();

        // Fill
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Center Cross
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x + 4, y);
        ctx.moveTo(x, y - 4);
        ctx.lineTo(x, y + 4);
        ctx.stroke();
    }
}

initWorker();
