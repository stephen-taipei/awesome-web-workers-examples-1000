const genDataBtn = document.getElementById('genDataBtn');
const trainBtn = document.getElementById('trainBtn');
const nTreesInput = document.getElementById('nTrees');
const maxDepthInput = document.getElementById('maxDepth');
const treeDisplay = document.getElementById('treeDisplay');
const depthDisplay = document.getElementById('depthDisplay');
const builtCount = document.getElementById('builtCount');
const accDisplay = document.getElementById('accDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('rfCanvas');
const ctx = canvas.getContext('2d');

let worker;
let currentData = [];
const colors = ['#e57373', '#64b5f6', '#ffd54f'];

nTreesInput.addEventListener('input', () => treeDisplay.textContent = nTreesInput.value);
maxDepthInput.addEventListener('input', () => depthDisplay.textContent = maxDepthInput.value);

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
            builtCount.textContent = data.treesBuilt;
        } else if (type === 'result') {
            statusText.textContent = 'Training Complete';
            accDisplay.textContent = (data.accuracy * 100).toFixed(1) + '%';
            drawDecisionBoundary(data.heatmap, data.gridSize);
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
    builtCount.textContent = '0';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    worker.postMessage({
        command: 'generate',
        width: canvas.width,
        height: canvas.height
    });
});

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const nTrees = parseInt(nTreesInput.value);
    const maxDepth = parseInt(maxDepthInput.value);

    trainBtn.disabled = true;
    genDataBtn.disabled = true;
    statusText.textContent = 'Training...';
    builtCount.textContent = '0';

    worker.postMessage({
        command: 'train',
        nTrees,
        maxDepth
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

function drawDecisionBoundary(heatmap, gridSize) {
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
        d[i*4+3] = 100; // Alpha
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
genDataBtn.click(); // Generate initial data
