const genDataBtn = document.getElementById('genDataBtn');
const computeBtn = document.getElementById('computeBtn');
const kInput = document.getElementById('kValue');
const pointCountSelect = document.getElementById('pointCount');
const kDisplay = document.getElementById('kDisplay');
const timeDisplay = document.getElementById('timeDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('knnCanvas');
const ctx = canvas.getContext('2d');

let worker;
let trainingData = [];
const colors = [[229, 115, 115], [100, 181, 246], [255, 241, 118]]; // RGB for 3 classes

kInput.addEventListener('input', () => kDisplay.textContent = kInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'data') {
            trainingData = data;
            drawPoints();
            statusText.textContent = 'Data Ready';
            computeBtn.disabled = false;
        } else if (type === 'result') {
            statusText.textContent = 'Completed';
            timeDisplay.textContent = `${data.duration}ms`;
            drawMap(data.map, data.width, data.height);
            computeBtn.disabled = false;
            genDataBtn.disabled = false;
        }
    };
}

genDataBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    const count = parseInt(pointCountSelect.value);
    
    statusText.textContent = 'Generating...';
    computeBtn.disabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    worker.postMessage({
        command: 'generate',
        count,
        width: canvas.width,
        height: canvas.height
    });
});

computeBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    const k = parseInt(kInput.value);

    computeBtn.disabled = true;
    genDataBtn.disabled = true;
    statusText.textContent = 'Computing Voronoi Map...';
    timeDisplay.textContent = '-';

    worker.postMessage({
        command: 'compute',
        k,
        width: canvas.width,
        height: canvas.height
    });
});

function drawPoints() {
    // We draw points on top later, but this is for initial view
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let p of trainingData) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        const c = colors[p.label];
        ctx.fillStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
    }
}

function drawMap(map, w, h) {
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    
    // map is flat array of labels (0, 1, 2)
    for (let i = 0; i < map.length; i++) {
        const label = map[i];
        const c = colors[label];
        d[i*4] = c[0];
        d[i*4+1] = c[1];
        d[i*4+2] = c[2];
        d[i*4+3] = 100; // Semi-transparent background
    }
    
    ctx.putImageData(imgData, 0, 0);
    
    // Draw points on top
    for (let p of trainingData) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        const c = colors[p.label];
        ctx.fillStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
    }
}

initWorker();
