const calcBtn = document.getElementById('calcBtn');
const statusText = document.getElementById('statusText');
const calcTime = document.getElementById('calcTime');
const canvas = document.getElementById('pricePathCanvas');
const ctx = canvas.getContext('2d');

const bsCall = document.getElementById('bsCall');
const bsPut = document.getElementById('bsPut');
const bsDelta = document.getElementById('bsDelta');
const bsGamma = document.getElementById('bsGamma');
const bsVega = document.getElementById('bsVega');
const bsTheta = document.getElementById('bsTheta');

const mcCall = document.getElementById('mcCall');
const mcPut = document.getElementById('mcPut');
const mcErr = document.getElementById('mcErr');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            calcTime.textContent = `${data.duration}ms`;
            
            // BS Results
            bsCall.textContent = data.bs.call.toFixed(4);
            bsPut.textContent = data.bs.put.toFixed(4);
            bsDelta.textContent = data.bs.delta.toFixed(4);
            bsGamma.textContent = data.bs.gamma.toFixed(4);
            bsVega.textContent = data.bs.vega.toFixed(4);
            bsTheta.textContent = data.bs.theta.toFixed(4);
            
            // MC Results
            mcCall.textContent = data.mc.call.toFixed(4);
            mcPut.textContent = data.mc.put.toFixed(4);
            mcErr.textContent = `±${data.mc.stdErr.toFixed(4)}`;
            
            drawPaths(data.paths, parseFloat(document.getElementById('spot').value));
            calcBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            calcBtn.disabled = false;
        }
    };
}

calcBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const params = {
        S: parseFloat(document.getElementById('spot').value),
        K: parseFloat(document.getElementById('strike').value),
        T: parseFloat(document.getElementById('time').value),
        r: parseFloat(document.getElementById('rate').value) / 100,
        sigma: parseFloat(document.getElementById('volatility').value) / 100,
        sims: parseInt(document.getElementById('sims').value)
    };
    
    calcBtn.disabled = true;
    statusText.textContent = 'Calculating...';
    calcTime.textContent = '-';
    
    worker.postMessage({
        command: 'calculate',
        params
    });
});

function drawPaths(paths, startPrice) {
    // Draw a few random paths from simulation to visualize Brownian Motion
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    if (!paths || paths.length === 0) return;
    
    const steps = paths[0].length;
    const stepX = w / (steps - 1);
    
    // Find Min/Max for scaling
    let minP = Infinity, maxP = -Infinity;
    for (let path of paths) {
        for (let p of path) {
            if (p < minP) minP = p;
            if (p > maxP) maxP = p;
        }
    }
    // Add padding
    const range = maxP - minP;
    minP -= range * 0.1;
    maxP += range * 0.1;
    
    const mapY = (p) => h - ((p - minP) / (maxP - minP)) * h;
    
    // Draw Strike Line
    const K = parseFloat(document.getElementById('strike').value);
    const yK = mapY(K);
    ctx.strokeStyle = '#ef5350';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, yK); ctx.lineTo(w, yK);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '10px Arial';
    ctx.fillStyle = '#ef5350';
    ctx.fillText(`Strike: ${K}`, 5, yK - 5);

    // Draw Paths
    ctx.lineWidth = 1;
    for (let path of paths) {
        ctx.strokeStyle = `rgba(33, 150, 243, 0.3)`;
        ctx.beginPath();
        for (let i = 0; i < steps; i++) {
            const x = i * stepX;
            const y = mapY(path[i]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
}

initWorker();
