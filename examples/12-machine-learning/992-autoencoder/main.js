const trainBtn = document.getElementById('trainBtn');
const stopBtn = document.getElementById('stopBtn');
const inputDimSelect = document.getElementById('inputDim');
const hiddenDimSelect = document.getElementById('hiddenDim');
const learningRateInput = document.getElementById('learningRate');
const lrDisplay = document.getElementById('lrDisplay');
const epochDisplay = document.getElementById('epochDisplay');
const lossDisplay = document.getElementById('lossDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('visCanvas');
const ctx = canvas.getContext('2d');

let worker;

learningRateInput.addEventListener('input', () => lrDisplay.textContent = learningRateInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    
    worker.onmessage = function(e) {
        const { type, data } = e.data;
        
        if (type === 'epoch') {
            epochDisplay.textContent = data.epoch;
            lossDisplay.textContent = data.loss.toFixed(6);
            drawVisualization(data.original, data.reconstructed);
        } else if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'done') {
            statusText.textContent = 'Training Finished';
            trainBtn.disabled = false;
            stopBtn.disabled = true;
        }
    };
}

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const inputDim = parseInt(inputDimSelect.value);
    const hiddenDim = parseInt(hiddenDimSelect.value);
    const learningRate = parseFloat(learningRateInput.value);

    trainBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Training...';
    
    worker.postMessage({
        command: 'start',
        inputDim,
        hiddenDim,
        learningRate
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

function drawVisualization(original, reconstructed) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    const barWidth = w / original.length;
    
    // Draw Original (Grey bars)
    ctx.fillStyle = '#bdc3c7';
    for (let i = 0; i < original.length; i++) {
        const height = original[i] * (h / 2); // Assume values 0-1 approx
        const x = i * barWidth;
        // ctx.fillRect(x, h - height, barWidth - 2, height);
        
        // Draw as line graph
        if (i === 0) ctx.moveTo(x + barWidth/2, h - original[i]*h*0.8);
        else ctx.lineTo(x + barWidth/2, h - original[i]*h*0.8);
    }
    
    // Draw Original Line
    ctx.beginPath();
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 4;
    for (let i = 0; i < original.length; i++) {
        const x = i * barWidth + barWidth/2;
        const y = h/2 - original[i] * (h/2.5); // Center around middle
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Reconstructed Line
    ctx.beginPath();
    ctx.strokeStyle = '#e056fd';
    ctx.lineWidth = 2;
    for (let i = 0; i < reconstructed.length; i++) {
        const x = i * barWidth + barWidth/2;
        const y = h/2 - reconstructed[i] * (h/2.5);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

// Initial worker setup
initWorker();
