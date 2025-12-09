const startBtn = document.getElementById('startBtn');
const alphaInput = document.getElementById('alpha');
const betaInput = document.getElementById('beta');
const deltaInput = document.getElementById('delta');
const gammaInput = document.getElementById('gamma');

const timeVal = document.getElementById('timeVal');
const preyCount = document.getElementById('preyCount');
const predCount = document.getElementById('predCount');

const popCanvas = document.getElementById('popCanvas');
const phaseCanvas = document.getElementById('phaseCanvas');
const popCtx = popCanvas.getContext('2d');
const phaseCtx = phaseCanvas.getContext('2d');

let worker;
let history = [];
let isRunning = false;

// Update displays
['alpha', 'beta', 'delta', 'gamma'].forEach(id => {
    const el = document.getElementById(id);
    const disp = document.getElementById(`${id}Display`);
    el.addEventListener('input', () => {
        disp.textContent = el.value;
        updateParams();
    });
});

function updateParams() {
    if (worker && isRunning) {
        worker.postMessage({
            command: 'params',
            alpha: parseFloat(alphaInput.value),
            beta: parseFloat(betaInput.value),
            delta: parseFloat(deltaInput.value),
            gamma: parseFloat(gammaInput.value)
        });
    }
}

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'step') {
            history.push(data);
            if (history.length > 500) history.shift();
            
            timeVal.textContent = data.t.toFixed(1);
            preyCount.textContent = data.prey.toFixed(2);
            predCount.textContent = data.pred.toFixed(2);
            
            drawPopChart();
            drawPhaseChart();
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    if (!isRunning) {
        worker.postMessage({
            command: 'start',
            alpha: parseFloat(alphaInput.value),
            beta: parseFloat(betaInput.value),
            delta: parseFloat(deltaInput.value),
            gamma: parseFloat(gammaInput.value)
        });
        isRunning = true;
        startBtn.textContent = 'Reset';
        history = [];
    } else {
        worker.terminate();
        worker = null;
        isRunning = false;
        startBtn.textContent = 'Start';
    }
});

function drawPopChart() {
    const w = popCanvas.width;
    const h = popCanvas.height;
    popCtx.clearRect(0, 0, w, h);
    
    // Scale Y
    let maxPop = 0;
    for(let p of history) maxPop = Math.max(maxPop, p.prey, p.pred);
    maxPop = Math.max(maxPop, 10);
    
    const stepX = w / Math.max(history.length, 100);
    
    // Prey (Green)
    popCtx.strokeStyle = '#2e7d32';
    popCtx.lineWidth = 2;
    popCtx.beginPath();
    for(let i=0; i<history.length; i++) {
        const x = i * stepX;
        const y = h - (history[i].prey / maxPop) * (h - 20) - 10;
        if(i===0) popCtx.moveTo(x, y); else popCtx.lineTo(x, y);
    }
    popCtx.stroke();
    
    // Predator (Red)
    popCtx.strokeStyle = '#c62828';
    popCtx.beginPath();
    for(let i=0; i<history.length; i++) {
        const x = i * stepX;
        const y = h - (history[i].pred / maxPop) * (h - 20) - 10;
        if(i===0) popCtx.moveTo(x, y); else popCtx.lineTo(x, y);
    }
    popCtx.stroke();
}

function drawPhaseChart() {
    const w = phaseCanvas.width;
    const h = phaseCanvas.height;
    phaseCtx.clearRect(0, 0, w, h);
    
    // Prey vs Predator
    // X axis: Prey, Y axis: Predator
    
    let maxVal = 0;
    for(let p of history) maxVal = Math.max(maxVal, p.prey, p.pred);
    maxVal = Math.max(maxVal, 10);
    
    phaseCtx.strokeStyle = '#5d4037';
    phaseCtx.lineWidth = 1.5;
    phaseCtx.beginPath();
    
    for(let i=0; i<history.length; i++) {
        const x = (history[i].prey / maxVal) * (w - 20) + 10;
        const y = h - ((history[i].pred / maxVal) * (h - 20) + 10);
        if(i===0) phaseCtx.moveTo(x, y); else phaseCtx.lineTo(x, y);
    }
    phaseCtx.stroke();
    
    // Dot at head
    if (history.length > 0) {
        const last = history[history.length-1];
        const lx = (last.prey / maxVal) * (w - 20) + 10;
        const ly = h - ((last.pred / maxVal) * (h - 20) + 10);
        phaseCtx.fillStyle = '#bf360c';
        phaseCtx.beginPath();
        phaseCtx.arc(lx, ly, 4, 0, Math.PI*2);
        phaseCtx.fill();
    }
}

initWorker();
