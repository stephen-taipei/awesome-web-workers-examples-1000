const startBtn = document.getElementById('startBtn');
const strategySelect = document.getElementById('strategy');
const iterationsInput = document.getElementById('iterations');
const gridSizeInput = document.getElementById('gridSize');
const canvas = document.getElementById('searchCanvas');
const ctx = canvas.getContext('2d');

// Stats elements
const elBestLoss = document.getElementById('bestLoss');
const elBestX = document.getElementById('bestX');
const elBestY = document.getElementById('bestY');
const elProgress = document.getElementById('progress');

let worker;
const rangeX = [-2, 2];
const rangeY = [-1, 3];

// Visualization mapping
function mapX(x) {
    return (x - rangeX[0]) / (rangeX[1] - rangeX[0]) * canvas.width;
}

function mapY(y) {
    return canvas.height - ((y - rangeY[0]) / (rangeY[1] - rangeY[0]) * canvas.height);
}

// Draw background gradient to represent the function landscape (simplified)
function drawBackground() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mapX(0), 0);
    ctx.lineTo(mapX(0), h);
    ctx.moveTo(0, mapY(0));
    ctx.lineTo(w, mapY(0));
    ctx.stroke();
}

drawBackground();

startBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
    }

    const strategy = strategySelect.value;
    const iterations = parseInt(iterationsInput.value);
    const gridSize = parseInt(gridSizeInput.value);

    drawBackground();
    elBestLoss.textContent = '-';
    elBestX.textContent = '-';
    elBestY.textContent = '-';
    elProgress.textContent = '0%';
    startBtn.disabled = true;

    worker = new Worker('worker.js');

    worker.postMessage({
        command: 'start',
        strategy,
        iterations,
        gridSize,
        rangeX,
        rangeY
    });

    worker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === 'point') {
            // Draw point
            const { x, y, loss } = data;
            // Color based on loss (lower is better/redder, higher is bluer)
            // Simple heuristic for color
            const intensity = Math.max(0, Math.min(255, 255 - loss * 2)); 
            ctx.fillStyle = `rgb(255, ${255 - intensity}, ${255 - intensity})`; 
            ctx.fillStyle = `hsl(${Math.min(240, loss * 10)}, 70%, 50%)`;
            
            ctx.beginPath();
            ctx.arc(mapX(x), mapY(y), 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'newBest') {
            const { x, y, loss } = data;
            elBestLoss.textContent = loss.toFixed(4);
            elBestX.textContent = x.toFixed(4);
            elBestY.textContent = y.toFixed(4);
            
            // Highlight best
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(mapX(x), mapY(y), 5, 0, Math.PI * 2);
            ctx.stroke();
        } else if (type === 'progress') {
            elProgress.textContent = `${data}%`;
        } else if (type === 'done') {
            elProgress.textContent = '100%';
            startBtn.disabled = false;
            worker.terminate();
            worker = null;
        }
    };
});
