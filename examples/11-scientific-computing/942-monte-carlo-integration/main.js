const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const funcInput = document.getElementById('funcStr');
const minXInput = document.getElementById('minX');
const maxXInput = document.getElementById('maxX');
const maxYInput = document.getElementById('maxY');

const totalCountEl = document.getElementById('totalCount');
const integralValEl = document.getElementById('integralVal');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('mcCanvas');
const ctx = canvas.getContext('2d');

let worker;
let params = {};

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'batch') {
            totalCountEl.textContent = data.total.toLocaleString();
            integralValEl.textContent = data.integral.toFixed(6);
            drawBatch(data.points);
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            statusText.style.color = 'red';
            stop();
        }
    };
}

function stop() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusText.textContent = 'Stopped';
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const func = funcInput.value;
    const minX = parseFloat(minXInput.value);
    const maxX = parseFloat(maxXInput.value);
    const maxY = parseFloat(maxYInput.value);
    const delay = parseInt(document.querySelector('input[name="speed"]:checked').value);

    if (maxX <= minX) {
        alert('Max X must be greater than Min X');
        return;
    }

    params = { minX, maxX, maxY }; // Store for drawing scaling
    
    // Reset Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(minX, maxX, maxY);
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Running...';
    statusText.style.color = '#1a237e';
    
    worker.postMessage({
        command: 'start',
        func,
        minX, maxX, maxY,
        delay
    });
});

stopBtn.addEventListener('click', stop);

function drawGrid(minX, maxX, maxY) {
    const w = canvas.width;
    const h = canvas.height;
    const rangeX = maxX - minX;
    
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    
    // X Axis
    const y0 = h - 20;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(w, y0);
    ctx.stroke();
    
    // Y Axis (approx at x=0 if visible, else left)
    let x0 = 0;
    if (minX < 0 && maxX > 0) {
        x0 = (0 - minX) / rangeX * w;
    }
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0, h);
    ctx.stroke();
    
    // Text
    ctx.fillStyle = '#555';
    ctx.font = '12px Arial';
    ctx.fillText(minX, 5, y0 - 5);
    ctx.fillText(maxX, w - 30, y0 - 5);
    ctx.fillText(maxY, x0 + 5, 15);
}

function drawBatch(points) {
    // points: [x, y, isUnder]
    const w = canvas.width;
    const h = canvas.height;
    const rangeX = params.maxX - params.minX;
    const maxY = params.maxY;
    
    // Draw pixels 1x1
    // Batch usually small enough to loop
    
    for (let i = 0; i < points.length; i += 3) {
        const px = points[i];
        const py = points[i+1];
        const isUnder = points[i+2];
        
        // Map to canvas
        const x = (px - params.minX) / rangeX * w;
        const y = h - 20 - (py / maxY) * (h - 20);
        
        ctx.fillStyle = isUnder ? 'rgba(63, 81, 181, 0.5)' : 'rgba(224, 224, 224, 0.5)';
        ctx.fillRect(x, y, 2, 2);
    }
}

initWorker();
