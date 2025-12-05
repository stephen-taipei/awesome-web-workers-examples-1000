const runBtn = document.getElementById('runBtn');
const popSizeSelect = document.getElementById('popSize');
const betaInput = document.getElementById('beta');
const gammaInput = document.getElementById('gamma');
const daysInput = document.getElementById('days');

const betaDisplay = document.getElementById('betaDisplay');
const gammaDisplay = document.getElementById('gammaDisplay');
const peakInf = document.getElementById('peakInf');
const totalRec = document.getElementById('totalRec');
const calcTime = document.getElementById('calcTime');
const canvas = document.getElementById('sirCanvas');
const ctx = canvas.getContext('2d');

let worker;

[betaInput, gammaInput].forEach(el => {
    el.addEventListener('input', () => {
        betaDisplay.textContent = betaInput.value;
        gammaDisplay.textContent = gammaInput.value;
    });
});

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            peakInf.textContent = Math.round(data.peakI).toLocaleString();
            totalRec.textContent = Math.round(data.finalR).toLocaleString();
            calcTime.textContent = `${data.duration}ms`;
            
            drawChart(data.history);
            runBtn.disabled = false;
        }
    };
}

runBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const N = parseInt(popSizeSelect.value);
    const beta = parseFloat(betaInput.value);
    const gamma = parseFloat(gammaInput.value);
    const days = parseInt(daysInput.value);

    runBtn.disabled = true;
    peakInf.textContent = '-';
    totalRec.textContent = '-';
    calcTime.textContent = '-';
    
    worker.postMessage({
        command: 'simulate',
        N, beta, gamma, days
    });
});

function drawChart(history) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // Find max population (usually N, but robust to scaling)
    const maxPop = parseInt(popSizeSelect.value);
    const steps = history.length;
    
    const mapX = i => (i / (steps - 1)) * w;
    const mapY = val => h - (val / maxPop) * h;
    
    // Draw Stacked Area or Lines? Lines are clearer for comparison.
    
    // Susceptible (Blue)
    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
        const x = mapX(i);
        const y = mapY(history[i].s);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    
    // Infected (Red)
    ctx.strokeStyle = '#f44336';
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
        const x = mapX(i);
        const y = mapY(history[i].i);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    
    // Recovered (Green)
    ctx.strokeStyle = '#4caf50';
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
        const x = mapX(i);
        const y = mapY(history[i].r);
        if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
}

initWorker();
runBtn.click();
