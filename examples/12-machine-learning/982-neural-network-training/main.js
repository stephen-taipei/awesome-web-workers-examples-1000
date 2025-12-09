const trainBtn = document.getElementById('trainBtn');
const stopBtn = document.getElementById('stopBtn');
const optimizerSelect = document.getElementById('optimizer');
const learningRateInput = document.getElementById('learningRate');
const batchSizeSelect = document.getElementById('batchSize');
const lrDisplay = document.getElementById('lrDisplay');
const epochDisplay = document.getElementById('epochDisplay');
const lossDisplay = document.getElementById('lossDisplay');
const accDisplay = document.getElementById('accDisplay');
const canvas = document.getElementById('boundaryCanvas');
const ctx = canvas.getContext('2d');

let worker;
const colors = ['#e57373', '#81c784', '#64b5f6']; // Class 0, 1, 2

learningRateInput.addEventListener('input', () => lrDisplay.textContent = learningRateInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'epoch') {
            epochDisplay.textContent = data.epoch;
            lossDisplay.textContent = data.loss.toFixed(4);
            accDisplay.textContent = (data.accuracy * 100).toFixed(1) + '%';
            
            drawBoundary(data.points, data.labels, data.heatmap, data.gridSize);
        } else if (type === 'done') {
            trainBtn.disabled = false;
            stopBtn.disabled = true;
        }
    };
}

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const optimizer = optimizerSelect.value;
    const learningRate = parseFloat(learningRateInput.value);
    const batchSize = parseInt(batchSizeSelect.value);

    trainBtn.disabled = true;
    stopBtn.disabled = false;
    epochDisplay.textContent = '0';
    
    worker.postMessage({
        command: 'start',
        optimizer,
        learningRate,
        batchSize
    });
});

stopBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        trainBtn.disabled = false;
        stopBtn.disabled = true;
        worker = null;
    }
});

function drawBoundary(points, labels, heatmap, gridSize) {
    const w = canvas.width;
    const h = canvas.height;
    
    // Draw Heatmap
    const imgData = ctx.createImageData(gridSize, gridSize);
    const data = imgData.data;
    
    // Heatmap comes as flat array of class predictions (0, 1, 2) or probabilities?
    // Worker sends rgb buffer or class indices?
    // Worker sends flat Class Index array for simplicity of transfer.
    
    for (let i = 0; i < heatmap.length; i++) {
        const classIdx = heatmap[i];
        const colorHex = colors[classIdx];
        
        // Parse hex to rgb
        const r = parseInt(colorHex.substring(1, 3), 16);
        const g = parseInt(colorHex.substring(3, 5), 16);
        const b = parseInt(colorHex.substring(5, 7), 16);
        
        data[i*4] = r;
        data[i*4+1] = g;
        data[i*4+2] = b;
        data[i*4+3] = 100; // Alpha (transparent)
    }
    
    // Create temp canvas to scale up
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = gridSize;
    tempCanvas.height = gridSize;
    tempCanvas.getContext('2d').putImageData(imgData, 0, 0);
    
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(tempCanvas, 0, 0, w, h);

    // Draw Data Points
    for (let i = 0; i < points.length; i += 2) {
        const x = points[i] * w; // Points are 0-1 normalized
        const y = points[i+1] * h;
        const label = labels[i/2];
        
        ctx.fillStyle = colors[label];
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

initWorker();
