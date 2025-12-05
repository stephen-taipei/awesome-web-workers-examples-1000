const trainBtn = document.getElementById('trainBtn');
const resetBtn = document.getElementById('resetBtn');
const hiddenNodesInput = document.getElementById('hiddenNodes');
const activationSelect = document.getElementById('activation');
const hiddenDisplay = document.getElementById('hiddenDisplay');
const epochDisplay = document.getElementById('epochDisplay');
const lossDisplay = document.getElementById('lossDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('xorCanvas');
const ctx = canvas.getContext('2d');

let worker;

hiddenNodesInput.addEventListener('input', () => hiddenDisplay.textContent = hiddenNodesInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'epoch') {
            epochDisplay.textContent = data.epoch;
            lossDisplay.textContent = data.loss.toFixed(6);
            drawBoundary(data.heatmap, data.inputs, data.targets, data.gridSize);
        } else if (type === 'done') {
            statusText.textContent = 'Converged';
            trainBtn.disabled = false;
        }
    };
}

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const hidden = parseInt(hiddenNodesInput.value);
    const act = activationSelect.value;

    trainBtn.disabled = true;
    statusText.textContent = 'Training...';
    
    worker.postMessage({
        command: 'train',
        hidden,
        activation: act
    });
});

resetBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    statusText.textContent = 'Reset';
    epochDisplay.textContent = '0';
    lossDisplay.textContent = '-';
    trainBtn.disabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function drawBoundary(heatmap, inputs, targets, gridSize) {
    const w = canvas.width;
    const h = canvas.height;
    
    // Draw Heatmap
    const imgData = ctx.createImageData(gridSize, gridSize);
    const data = imgData.data;
    
    for (let i = 0; i < heatmap.length; i++) {
        const val = heatmap[i]; // 0 to 1
        // Blue (1) to Red (0)
        // Simple interpolation
        data[i*4] = Math.floor(255 * (1 - val));   // R
        data[i*4+1] = Math.floor(100 * val);       // G
        data[i*4+2] = Math.floor(255 * val);       // B
        data[i*4+3] = 255; // Alpha
    }
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = gridSize;
    tempCanvas.height = gridSize;
    tempCanvas.getContext('2d').putImageData(imgData, 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, w, h);

    // Draw Inputs (0,0), (0,1), (1,0), (1,1)
    // Remap 0,1 space to canvas with padding
    const padding = 50;
    const scaleX = w - 2 * padding;
    const scaleY = h - 2 * padding;

    for (let i = 0; i < inputs.length; i++) {
        const x = padding + inputs[i][0] * scaleX;
        const y = padding + (1 - inputs[i][1]) * scaleY; // Invert Y for canvas
        const target = targets[i];

        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = target === 1 ? '#448aff' : '#f44336'; // Target color
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();
        
        // Text Label
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.fillText(target, x + 12, y - 12);
    }
}

initWorker();
