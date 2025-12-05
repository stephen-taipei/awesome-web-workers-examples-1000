const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const eqZInput = document.getElementById('eqZ');
const typeSelect = document.getElementById('type');
const lrInput = document.getElementById('learningRate');
const lrDisplay = document.getElementById('lrDisplay');

const posDisplay = document.getElementById('posDisplay');
const valDisplay = document.getElementById('valDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('searchCanvas');
const ctx = canvas.getContext('2d');

let worker;
let path = [];
let heatmapCache = null;

lrInput.addEventListener('input', () => lrDisplay.textContent = lrInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'heatmap') {
            heatmapCache = data;
            drawHeatmap();
            statusText.textContent = 'Ready';
            startBtn.disabled = false;
        } else if (type === 'step') {
            path.push(data.pos);
            drawPath();
            posDisplay.textContent = `(${data.pos.x.toFixed(3)}, ${data.pos.y.toFixed(3)})`;
            valDisplay.textContent = data.val.toFixed(4);
        } else if (type === 'done') {
            statusText.textContent = 'Converged / Stopped';
            startBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            statusText.style.color = 'red';
        }
    };
}

function computeHeatmap() {
    if (!worker) initWorker();
    
    const eqZ = eqZInput.value;
    const type = typeSelect.value;
    
    statusText.textContent = 'Generating Heatmap...';
    startBtn.disabled = true;
    
    worker.postMessage({
        command: 'init',
        eqZ,
        width: canvas.width,
        height: canvas.height,
        range: 5 // -5 to 5
    });
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const type = typeSelect.value;
    const lr = parseFloat(lrInput.value);
    
    // Start at random position
    const startX = (Math.random() - 0.5) * 8;
    const startY = (Math.random() - 0.5) * 8;
    path = [{x: startX, y: startY}];
    
    startBtn.disabled = true;
    statusText.textContent = 'Searching...';
    
    worker.postMessage({
        command: 'start',
        startX, startY,
        type, // min or max
        lr
    });
});

resetBtn.addEventListener('click', () => {
    path = [];
    computeHeatmap(); // Re-init
});

// Initial load
computeHeatmap();

function drawHeatmap() {
    if (!heatmapCache) return;
    
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const d = imgData.data;
    const map = heatmapCache.map;
    const min = heatmapCache.min;
    const max = heatmapCache.max;
    
    for (let i = 0; i < map.length; i++) {
        const val = map[i];
        const t = (val - min) / (max - min); // 0 to 1
        
        // Color Map: Purple/Blue (Low) -> Yellow (High)
        // Simple: Blue -> Red
        const r = Math.floor(255 * t);
        const b = Math.floor(255 * (1 - t));
        
        d[i*4] = r;
        d[i*4+1] = 0;
        d[i*4+2] = b;
        d[i*4+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
}

function drawPath() {
    drawHeatmap(); // Redraw background
    
    const w = canvas.width;
    const h = canvas.height;
    const range = 5;
    
    const mapX = (x) => (x + range) / (2 * range) * w;
    const mapY = (y) => h - (y + range) / (2 * range) * h;
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    
    for (let i = 0; i < path.length; i++) {
        const px = mapX(path[i].x);
        const py = mapY(path[i].y);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
    
    // Current point
    const last = path[path.length-1];
    const lx = mapX(last.x);
    const ly = mapY(last.y);
    
    ctx.fillStyle = '#d500f9';
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
}
