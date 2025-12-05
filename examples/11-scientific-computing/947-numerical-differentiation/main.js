const calcBtn = document.getElementById('calcBtn');
const funcSelect = document.getElementById('func');
const methodSelect = document.getElementById('method');
const stepInput = document.getElementById('stepH');

const pointCountEl = document.getElementById('pointCount');
const calcTimeEl = document.getElementById('calcTime');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('diffCanvas');
const ctx = canvas.getContext('2d');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            calcTimeEl.textContent = `${data.duration}ms`;
            pointCountEl.textContent = data.x.length;
            
            drawGraph(data.x, data.y, data.dy);
            calcBtn.disabled = false;
        }
    };
}

calcBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const func = funcSelect.value;
    const method = methodSelect.value;
    const h = parseFloat(stepInput.value);

    calcBtn.disabled = true;
    statusText.textContent = 'Calculating...';
    calcTimeEl.textContent = '-';

    worker.postMessage({
        command: 'compute',
        func, method, h,
        rangeStart: -5,
        rangeEnd: 5,
        steps: 500 // Visual resolution
    });
});

function drawGraph(xArr, yArr, dyArr) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Scales
    const minX = xArr[0];
    const maxX = xArr[xArr.length - 1];
    
    // Find Y bounds including derivative
    let minY = Infinity, maxY = -Infinity;
    for (let val of yArr) {
        if (val < minY) minY = val;
        if (val > maxY) maxY = val;
    }
    for (let val of dyArr) {
        if (val < minY) minY = val;
        if (val > maxY) maxY = val;
    }
    
    // Padding
    const pad = 20;
    const rangeY = maxY - minY || 1;
    
    const mapX = val => pad + ((val - minX) / (maxX - minX)) * (w - 2*pad);
    const mapY = val => h - pad - ((val - minY) / rangeY) * (h - 2*pad);

    // Axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    
    if (minY <= 0 && maxY >= 0) {
        const y0 = mapY(0);
        ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.stroke();
    }
    
    // Draw Function f(x)
    ctx.strokeStyle = '#1976d2'; // Blue
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < xArr.length; i++) {
        if (i===0) ctx.moveTo(mapX(xArr[i]), mapY(yArr[i]));
        else ctx.lineTo(mapX(xArr[i]), mapY(yArr[i]));
    }
    ctx.stroke();

    // Draw Derivative f'(x)
    ctx.strokeStyle = '#d84315'; // Orange
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < xArr.length; i++) {
        // Derivative array is usually size N-1 or N depending on method
        if (i < dyArr.length) {
            if (i===0) ctx.moveTo(mapX(xArr[i]), mapY(dyArr[i]));
            else ctx.lineTo(mapX(xArr[i]), mapY(dyArr[i]));
        }
    }
    ctx.stroke();
}

initWorker();
calcBtn.click();
