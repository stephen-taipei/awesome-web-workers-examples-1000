const genDataBtn = document.getElementById('genDataBtn');
const trainBtn = document.getElementById('trainBtn');
const kernelSelect = document.getElementById('kernel');
const cInput = document.getElementById('C');
const sigmaInput = document.getElementById('sigma');
const cDisplay = document.getElementById('cDisplay');
const sigmaDisplay = document.getElementById('sigmaDisplay');
const iterDisplay = document.getElementById('iterDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('svmCanvas');
const ctx = canvas.getContext('2d');

let worker;
let currentData = [];

cInput.addEventListener('input', () => cDisplay.textContent = cInput.value);
sigmaInput.addEventListener('input', () => sigmaDisplay.textContent = sigmaInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'data') {
            currentData = data;
            drawPoints(data);
            statusText.textContent = 'Data Generated';
            trainBtn.disabled = false;
        } else if (type === 'progress') {
            iterDisplay.textContent = data.iter;
        } else if (type === 'result') {
            statusText.textContent = 'Converged';
            drawBoundary(data.grid, data.gridSize);
            trainBtn.disabled = false;
            genDataBtn.disabled = false;
        }
    };
}

genDataBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    statusText.textContent = 'Generating...';
    trainBtn.disabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    worker.postMessage({
        command: 'generate'
    });
});

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const kernel = kernelSelect.value;
    const C = parseFloat(cInput.value);
    const sigma = parseFloat(sigmaInput.value);

    trainBtn.disabled = true;
    genDataBtn.disabled = true;
    statusText.textContent = 'Training (SMO)...';
    iterDisplay.textContent = '0';

    worker.postMessage({
        command: 'train',
        kernel,
        C,
        sigma
    });
});

function drawPoints(data) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let p of data) {
        // Map -1..1 to Canvas
        const x = (p.x + 1) / 2 * canvas.width;
        const y = (p.y + 1) / 2 * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = p.label === 1 ? '#ef5350' : '#42a5f5';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
    }
}

function drawBoundary(grid, size) {
    // Draw background heatmap based on grid
    const imgData = ctx.createImageData(size, size);
    const d = imgData.data;
    
    // Grid is flat array of values (decision function output)
    // We want to color based on sign and magnitude (margin)
    // value > 0 red, value < 0 blue.
    // Near 0 is white (boundary).
    
    for (let i = 0; i < grid.length; i++) {
        const val = grid[i];
        const intensity = Math.min(1, Math.abs(val)); // Clamp
        
        if (val > 0) {
            // Reddish
            d[i*4] = 255;
            d[i*4+1] = 255 * (1 - intensity * 0.5);
            d[i*4+2] = 255 * (1 - intensity * 0.5);
        } else {
            // Bluish
            d[i*4] = 255 * (1 - intensity * 0.5);
            d[i*4+1] = 255 * (1 - intensity * 0.5);
            d[i*4+2] = 255;
        }
        d[i*4+3] = 100; // Alpha
    }
    
    // Draw image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    tempCanvas.getContext('2d').putImageData(imgData, 0, 0);
    
    // Draw points on top
    // We need to preserve points.
    // Instead of clearing, draw image behind?
    // Easier to redraw points.
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    
    // Redraw points
    drawPoints(currentData);
}

initWorker();
