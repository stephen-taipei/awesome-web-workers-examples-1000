const genDataBtn = document.getElementById('genDataBtn');
const trainBtn = document.getElementById('trainBtn');
const maxDepthInput = document.getElementById('maxDepth');
const minSamplesInput = document.getElementById('minSamples');
const criterionSelect = document.getElementById('criterion');

const depthDisplay = document.getElementById('depthDisplay');
const sampleDisplay = document.getElementById('sampleDisplay');
const actualDepth = document.getElementById('actualDepth');
const leafCount = document.getElementById('leafCount');
const accDisplay = document.getElementById('accDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('treeCanvas');
const ctx = canvas.getContext('2d');

let worker;
let currentData = [];
const colors = ['#ff7043', '#42a5f5'];

maxDepthInput.addEventListener('input', () => depthDisplay.textContent = maxDepthInput.value);
minSamplesInput.addEventListener('input', () => sampleDisplay.textContent = minSamplesInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'data') {
            currentData = data;
            drawPoints(data);
            statusText.textContent = 'Data Ready';
            trainBtn.disabled = false;
        } else if (type === 'result') {
            statusText.textContent = 'Training Complete';
            actualDepth.textContent = data.stats.depth;
            leafCount.textContent = data.stats.leaves;
            accDisplay.textContent = (data.accuracy * 100).toFixed(1) + '%';
            
            drawRegions(data.heatmap, data.gridSize);
            trainBtn.disabled = false;
            genDataBtn.disabled = false;
        }
    };
}

genDataBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    statusText.textContent = 'Generating...';
    trainBtn.disabled = true;
    accDisplay.textContent = '-';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    worker.postMessage({
        command: 'generate',
        width: canvas.width,
        height: canvas.height
    });
});

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const maxDepth = parseInt(maxDepthInput.value);
    const minSamples = parseInt(minSamplesInput.value);
    const criterion = criterionSelect.value;

    trainBtn.disabled = true;
    genDataBtn.disabled = true;
    statusText.textContent = 'Building Tree...';

    worker.postMessage({
        command: 'train',
        maxDepth,
        minSamples,
        criterion
    });
});

function drawPoints(points) {
    for (let p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = colors[p.label];
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
    }
}

function drawRegions(heatmap, gridSize) {
    const w = canvas.width;
    const h = canvas.height;
    
    const imgData = ctx.createImageData(gridSize, gridSize);
    const d = imgData.data;
    
    for (let i = 0; i < heatmap.length; i++) {
        const label = heatmap[i];
        // Hex to RGB
        const hex = colors[label];
        const r = parseInt(hex.substr(1,2), 16);
        const g = parseInt(hex.substr(3,2), 16);
        const b = parseInt(hex.substr(5,2), 16);
        
        d[i*4] = r;
        d[i*4+1] = g;
        d[i*4+2] = b;
        d[i*4+3] = 80; // Alpha (transparent)
    }
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = gridSize;
    tempCanvas.height = gridSize;
    tempCanvas.getContext('2d').putImageData(imgData, 0, 0);
    
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(tempCanvas, 0, 0, w, h);
    
    drawPoints(currentData);
}

initWorker();
genDataBtn.click();
