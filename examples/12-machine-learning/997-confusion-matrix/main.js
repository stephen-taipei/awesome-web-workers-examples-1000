const generateBtn = document.getElementById('generateBtn');
const sampleSizeSelect = document.getElementById('sampleSize');
const classCountInput = document.getElementById('classCount');
const errorRateInput = document.getElementById('errorRate');
const errorRateDisplay = document.getElementById('errorRateDisplay');
const timeValue = document.getElementById('timeValue');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('heatmapCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const heatmapContainer = document.getElementById('heatmapContainer');

let worker;
let matrixData = null;
let numClasses = 10;
let cellSize = 0;

// Error rate slider
errorRateInput.addEventListener('input', (e) => {
    errorRateDisplay.textContent = `${e.target.value}%`;
});

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    
    worker.onmessage = function(e) {
        const { type, data } = e.data;
        
        if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'result') {
            statusText.textContent = 'Completed';
            timeValue.textContent = `${data.duration}ms`;
            matrixData = data.matrix;
            numClasses = data.classes;
            drawHeatmap();
            generateBtn.disabled = false;
        }
    };
}

generateBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const sampleSize = parseInt(sampleSizeSelect.value);
    const classes = parseInt(classCountInput.value);
    const errorRate = parseInt(errorRateInput.value) / 100;

    generateBtn.disabled = true;
    statusText.textContent = 'Initializing...';
    timeValue.textContent = '-';
    matrixData = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    worker.postMessage({
        command: 'compute',
        sampleSize,
        classes,
        errorRate
    });
});

function drawHeatmap() {
    if (!matrixData) return;

    const w = canvas.width;
    const h = canvas.height;
    cellSize = w / numClasses;

    // Find max value for normalization
    let maxVal = 0;
    for (let i = 0; i < matrixData.length; i++) {
        if (matrixData[i] > maxVal) maxVal = matrixData[i];
    }

    ctx.clearRect(0, 0, w, h);

    for (let row = 0; row < numClasses; row++) {
        for (let col = 0; col < numClasses; col++) {
            const value = matrixData[row * numClasses + col];
            const x = col * cellSize;
            const y = row * cellSize;

            // Color calculation: Higher value = Darker Blue
            // Diagonal (True Positives) usually has high values
            // Off-diagonal (Errors) usually has low values
            
            // Use a logarithmic scale for better visualization of errors if maxVal is dominant
            const intensity = value / maxVal;
            
            // Simple blue scale
            // ctx.fillStyle = `rgba(66, 153, 225, ${intensity})`;
            
            // Custom Heatmap: White to Blue
            const r = Math.floor(255 - 200 * intensity);
            const g = Math.floor(255 - 150 * intensity);
            const b = 255;
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cellSize, cellSize);

            // Draw text if grid is large enough
            if (cellSize > 30) {
                ctx.fillStyle = intensity > 0.5 ? '#fff' : '#333';
                ctx.font = `${Math.min(14, cellSize/3)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(value, x + cellSize/2, y + cellSize/2);
            }
        }
    }
}

// Tooltip interaction
heatmapContainer.addEventListener('mousemove', (e) => {
    if (!matrixData) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const col = Math.floor(mouseX / cellSize);
    const row = Math.floor(mouseY / cellSize);

    if (col >= 0 && col < numClasses && row >= 0 && row < numClasses) {
        const value = matrixData[row * numClasses + col];
        
        tooltip.style.left = `${e.clientX - rect.left}px`;
        tooltip.style.top = `${e.clientY - rect.top}px`;
        tooltip.classList.remove('hidden');
        
        const label = row === col ? "Correct" : "Misclassified";
        tooltip.innerHTML = `
            <strong>Actual:</strong> Class ${row}<br>
            <strong>Predicted:</strong> Class ${col}<br>
            <strong>Count:</strong> ${value}<br>
            <em>${label}</em>
        `;
    } else {
        tooltip.classList.add('hidden');
    }
});

heatmapContainer.addEventListener('mouseleave', () => {
    tooltip.classList.add('hidden');
});

// Init
initWorker();
