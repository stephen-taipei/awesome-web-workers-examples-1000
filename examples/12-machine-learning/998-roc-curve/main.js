const calculateBtn = document.getElementById('calculateBtn');
const sampleSizeSelect = document.getElementById('sampleSize');
const noiseInput = document.getElementById('noise');
const aucValue = document.getElementById('aucValue');
const statusText = document.getElementById('statusText');
const timeValue = document.getElementById('timeValue');
const canvas = document.getElementById('rocCanvas');
const ctx = canvas.getContext('2d');

const worker = new Worker('worker.js');

calculateBtn.addEventListener('click', () => {
    const sampleSize = parseInt(sampleSizeSelect.value);
    const noise = parseFloat(noiseInput.value);

    calculateBtn.disabled = true;
    statusText.textContent = 'Generating Data...';
    statusText.style.color = '#d63031';
    aucValue.textContent = '-';
    timeValue.textContent = '-';
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    worker.postMessage({
        command: 'calculate',
        sampleSize,
        noise
    });
});

worker.onmessage = function(e) {
    const { type, data } = e.data;

    if (type === 'status') {
        statusText.textContent = data;
    } else if (type === 'result') {
        const { auc, rocPoints, duration } = data;
        
        statusText.textContent = 'Completed';
        statusText.style.color = '#00b894';
        aucValue.textContent = auc.toFixed(4);
        timeValue.textContent = `${duration}ms`;
        calculateBtn.disabled = false;

        drawROC(rocPoints);
    }
};

function drawGrid() {
    const w = canvas.width;
    const h = canvas.height;
    const padding = 40;
    
    ctx.save();
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;

    // Grid lines
    for (let i = 0; i <= 10; i++) {
        const x = padding + (w - 2 * padding) * (i / 10);
        const y = h - padding - (h - 2 * padding) * (i / 10);
        
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, h - padding);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(w - padding, y);
        ctx.stroke();
    }

    // Diagonal (Random Guess)
    ctx.strokeStyle = '#b2bec3';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, h - padding);
    ctx.lineTo(w - padding, padding);
    ctx.stroke();
    ctx.setLineDash([]);

    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, h - padding);
    ctx.lineTo(w - padding, h - padding);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('False Positive Rate (FPR)', w / 2, h - 10);
    
    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('True Positive Rate (TPR)', 0, 0);
    ctx.restore();

    ctx.restore();
}

function drawROC(points) {
    const w = canvas.width;
    const h = canvas.height;
    const padding = 40;
    const plotW = w - 2 * padding;
    const plotH = h - 2 * padding;

    ctx.strokeStyle = '#e84393';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    // Points are [fpr, tpr]
    // Map 0..1 to plot coordinates
    // x: padding + fpr * plotW
    // y: h - padding - tpr * plotH

    ctx.moveTo(padding, h - padding); // Start at 0,0

    for (let i = 0; i < points.length; i++) {
        const [fpr, tpr] = points[i];
        const x = padding + fpr * plotW;
        const y = h - padding - tpr * plotH;
        ctx.lineTo(x, y);
    }

    ctx.stroke();
    
    // Fill area
    ctx.fillStyle = 'rgba(232, 67, 147, 0.1)';
    ctx.lineTo(padding + plotW, h - padding);
    ctx.lineTo(padding, h - padding);
    ctx.fill();
}

// Initial draw
drawGrid();
