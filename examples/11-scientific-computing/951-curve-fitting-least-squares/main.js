const genBtn = document.getElementById('genBtn');
const fitBtn = document.getElementById('fitBtn');
const degreeInput = document.getElementById('degree');
const pointsSelect = document.getElementById('points');
const noiseInput = document.getElementById('noise');

const degreeDisplay = document.getElementById('degreeDisplay');
const r2Display = document.getElementById('r2Display');
const timeDisplay = document.getElementById('timeDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('fitCanvas');
const ctx = canvas.getContext('2d');

let worker;
let currentData = [];

degreeInput.addEventListener('input', () => degreeDisplay.textContent = degreeInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'data') {
            currentData = data;
            draw(currentData, null);
            statusText.textContent = 'Data Generated';
            fitBtn.disabled = false;
        } else if (type === 'result') {
            statusText.textContent = 'Converged';
            timeDisplay.textContent = `${data.duration}ms`;
            r2Display.textContent = data.r2.toFixed(4);
            
            draw(currentData, data.coeffs);
            fitBtn.disabled = false;
            genBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = 'Error: Singular Matrix?';
            fitBtn.disabled = false;
        }
    };
}

genBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const n = parseInt(pointsSelect.value);
    const noise = parseInt(noiseInput.value);

    genBtn.disabled = true;
    fitBtn.disabled = true;
    statusText.textContent = 'Generating...';
    r2Display.textContent = '-';
    timeDisplay.textContent = '-';
    
    worker.postMessage({
        command: 'generate',
        n, noise
    });
});

fitBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    const degree = parseInt(degreeInput.value);

    fitBtn.disabled = true;
    genBtn.disabled = true;
    statusText.textContent = 'Solving (Normal Equation)...';

    worker.postMessage({
        command: 'fit',
        degree
    });
});

function draw(points, coeffs) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Setup scale
    // X: 0..1 -> 20..w-20
    // Y: -2..2 -> h-20..20
    const padding = 30;
    const mapX = x => padding + x * (w - 2*padding);
    const mapY = y => h/2 - (y / 2) * (h/2 - padding); // Center 0

    // Draw Axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, h/2); ctx.lineTo(w-padding, h/2);
    ctx.moveTo(padding, 0); ctx.lineTo(padding, h);
    ctx.stroke();

    // Points
    ctx.fillStyle = '#00bcd4';
    for (let p of points) {
        ctx.beginPath();
        ctx.arc(mapX(p.x), mapY(p.y), 3, 0, Math.PI*2);
        ctx.fill();
    }

    // Curve
    if (coeffs) {
        ctx.strokeStyle = '#ef5350';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let px = 0; px <= w; px+=2) {
            const x = (px - padding) / (w - 2*padding);
            if (x < 0 || x > 1) continue;
            
            // Eval polynomial: y = c0 + c1*x + c2*x^2 ...
            let y = 0;
            for (let i = 0; i < coeffs.length; i++) {
                y += coeffs[i] * Math.pow(x, i);
            }
            
            const py = mapY(y);
            if (px === 0) ctx.moveTo(mapX(x), py);
            else ctx.lineTo(mapX(x), py);
        }
        ctx.stroke();
    }
}

initWorker();
genBtn.click();
