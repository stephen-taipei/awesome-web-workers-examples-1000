const simBtn = document.getElementById('simBtn');
const meanFinal = document.getElementById('meanFinal');
const medianFinal = document.getElementById('medianFinal');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('chartCanvas');
const ctx = canvas.getContext('2d');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            meanFinal.textContent = `$${data.mean.toFixed(2)}`;
            medianFinal.textContent = `$${data.median.toFixed(2)}`;
            
            drawPaths(data.paths, data.timeSteps, parseFloat(document.getElementById('startPrice').value));
            simBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = 'Error';
            simBtn.disabled = false;
        }
    };
}

simBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const params = {
        S0: parseFloat(document.getElementById('startPrice').value),
        mu: parseFloat(document.getElementById('mu').value) / 100,
        sigma: parseFloat(document.getElementById('sigma').value) / 100,
        T: parseFloat(document.getElementById('years').value),
        paths: parseInt(document.getElementById('paths').value)
    };
    
    simBtn.disabled = true;
    statusText.textContent = 'Simulating...';
    meanFinal.textContent = '-';
    
    worker.postMessage({
        command: 'simulate',
        params
    });
});

function drawPaths(paths, steps, S0) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // Determine scales
    let minP = Infinity, maxP = -Infinity;
    for (let path of paths) {
        for (let p of path) {
            if (p < minP) minP = p;
            if (p > maxP) maxP = p;
        }
    }
    // Padding
    minP *= 0.9;
    maxP *= 1.1;
    
    const stepX = w / steps;
    const mapY = (val) => h - ((val - minP) / (maxP - minP)) * h;
    
    // Draw Paths (Semi-transparent)
    ctx.lineWidth = 1;
    
    // Limit drawing if too many paths to avoid hanging UI
    const drawLimit = 500;
    const stepPath = Math.max(1, Math.floor(paths.length / drawLimit));
    
    for (let i = 0; i < paths.length; i += stepPath) {
        const path = paths[i];
        const finalVal = path[path.length - 1];
        
        // Color based on gain/loss
        if (finalVal >= S0) ctx.strokeStyle = 'rgba(0, 150, 136, 0.15)'; // Greenish
        else ctx.strokeStyle = 'rgba(229, 57, 53, 0.15)'; // Reddish
        
        ctx.beginPath();
        ctx.moveTo(0, mapY(path[0]));
        
        for (let j = 1; j < path.length; j++) {
            ctx.lineTo(j * stepX, mapY(path[j]));
        }
        ctx.stroke();
    }
    
    // Draw Average Path
    // Calculate average per step
    ctx.strokeStyle = '#004d40';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let j = 0; j <= steps; j++) {
        let sum = 0;
        for (let i = 0; i < paths.length; i++) sum += paths[i][j];
        const avg = sum / paths.length;
        const x = j * stepX;
        const y = mapY(avg);
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Draw Start Line
    const startY = mapY(S0);
    ctx.strokeStyle = '#333';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, startY); ctx.lineTo(w, startY);
    ctx.stroke();
    ctx.setLineDash([]);
}

initWorker();
