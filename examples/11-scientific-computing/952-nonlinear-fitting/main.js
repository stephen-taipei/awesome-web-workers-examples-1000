const fitBtn = document.getElementById('fitBtn');
const trueA = document.getElementById('trueA');
const trueB = document.getElementById('trueB');
const trueC = document.getElementById('trueC');
const noiseInput = document.getElementById('noise');

const valA = document.getElementById('valA');
const valB = document.getElementById('valB');
const valC = document.getElementById('valC');

const iterDisplay = document.getElementById('iterDisplay');
const rssDisplay = document.getElementById('rssDisplay');
const fitA = document.getElementById('fitA');
const fitB = document.getElementById('fitB');
const fitC = document.getElementById('fitC');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('fitCanvas');
const ctx = canvas.getContext('2d');

let worker;
let currentData = [];
let trueParams = {};

[trueA, trueB, trueC].forEach(el => {
    el.addEventListener('input', () => {
        valA.textContent = trueA.value;
        valB.textContent = trueB.value;
        valC.textContent = trueC.value;
    });
});

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'step') {
            iterDisplay.textContent = data.iter;
            rssDisplay.textContent = data.rss.toFixed(5);
            fitA.textContent = data.params[0].toFixed(4);
            fitB.textContent = data.params[1].toFixed(4);
            fitC.textContent = data.params[2].toFixed(4);
            
            draw(currentData, trueParams, data.params);
        } else if (type === 'done') {
            statusText.textContent = 'Converged';
            fitBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = 'Diverged / Error';
            fitBtn.disabled = false;
        }
    };
}

fitBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const a = parseFloat(trueA.value);
    const b = parseFloat(trueB.value);
    const c = parseFloat(trueC.value);
    const noise = parseFloat(noiseInput.value);
    
    trueParams = { a, b, c };

    // Generate Data in Main Thread or Worker? 
    // Let's do it here to pass to worker, simulating "User Data"
    currentData = [];
    for (let x = 0; x <= 10; x += 0.2) {
        const y = a * Math.exp(-b * x) + c + (Math.random() - 0.5) * noise;
        currentData.push({ x, y });
    }

    fitBtn.disabled = true;
    statusText.textContent = 'Fitting...';
    iterDisplay.textContent = '0';
    
    // Draw initial data
    draw(currentData, trueParams, null);

    worker.postMessage({
        command: 'fit',
        data: currentData,
        // Guess initial params poorly to show convergence
        initialParams: [1, 0.1, 0] 
    });
});

function draw(points, trueP, fitP) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Scales
    const maxX = 10;
    const maxY = Math.max(...points.map(p => p.y)) * 1.1;
    
    const mapX = x => (x / maxX) * (w - 40) + 20;
    const mapY = y => h - ((y / maxY) * (h - 40) + 20);

    // Axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, h-20); ctx.lineTo(w-20, h-20);
    ctx.moveTo(20, h-20); ctx.lineTo(20, 20);
    ctx.stroke();

    // Points
    ctx.fillStyle = '#999';
    for (let p of points) {
        ctx.beginPath();
        ctx.arc(mapX(p.x), mapY(p.y), 3, 0, Math.PI*2);
        ctx.fill();
    }

    // True Curve (Green Dashed)
    if (trueP) {
        ctx.strokeStyle = '#43a047';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (let x = 0; x <= 10; x += 0.1) {
            const y = trueP.a * Math.exp(-trueP.b * x) + trueP.c;
            const px = mapX(x);
            const py = mapY(y);
            if (x === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Fit Curve (Red Solid)
    if (fitP) {
        ctx.strokeStyle = '#e53935';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= 10; x += 0.1) {
            // Params: [a, b, c]
            const y = fitP[0] * Math.exp(-fitP[1] * x) + fitP[2];
            const px = mapX(x);
            const py = mapY(y);
            if (x === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
}

initWorker();
