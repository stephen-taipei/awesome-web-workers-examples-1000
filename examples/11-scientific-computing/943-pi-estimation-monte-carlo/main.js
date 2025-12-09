const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const batchSizeSelect = document.getElementById('batchSize');
const totalPointsEl = document.getElementById('totalPoints');
const piEstEl = document.getElementById('piEst');
const piErrEl = document.getElementById('piErr');
const canvas = document.getElementById('mcCanvas');
const ctx = canvas.getContext('2d');

let worker;
let imageData;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'update') {
            totalPointsEl.textContent = data.total.toLocaleString();
            piEstEl.textContent = data.estimate.toFixed(6);
            const err = Math.abs((data.estimate - Math.PI) / Math.PI) * 100;
            piErrEl.textContent = err.toFixed(4);
            
            drawBatch(data.points);
        }
    };
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw Circle Boundary
    ctx.beginPath();
    ctx.arc(200, 200, 200, 0, Math.PI * 2);
    ctx.strokeStyle = '#f06292';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawBatch(points) {
    // Points: [x, y, inside]
    // Draw 1x1 rects
    // Batch optimize: fillStyle change minimizes state change
    
    ctx.fillStyle = '#ad1457'; // Inside
    for (let i = 0; i < points.length; i += 3) {
        if (points[i+2]) {
            // Map -1..1 to 0..400
            const x = (points[i] + 1) * 200;
            const y = (points[i+1] + 1) * 200;
            ctx.fillRect(x, y, 1, 1);
        }
    }
    
    ctx.fillStyle = '#f8bbd0'; // Outside
    for (let i = 0; i < points.length; i += 3) {
        if (!points[i+2]) {
            const x = (points[i] + 1) * 200;
            const y = (points[i+1] + 1) * 200;
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const batch = parseInt(batchSizeSelect.value);
    clearCanvas();
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
    worker.postMessage({
        command: 'start',
        batch
    });
});

stopBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
});

clearCanvas();
