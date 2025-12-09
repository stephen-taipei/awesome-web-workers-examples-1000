const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const treeInput = document.getElementById('probTree');
const growInput = document.getElementById('probGrow');
const burnInput = document.getElementById('probBurn');

const pDisplay = document.getElementById('pDisplay');
const fDisplay = document.getElementById('fDisplay');
const treeCount = document.getElementById('treeCount');
const fireCount = document.getElementById('fireCount');
const tickCount = document.getElementById('tickCount');
const canvas = document.getElementById('forestCanvas');
const ctx = canvas.getContext('2d');

let worker;
let imageData;
let isRunning = false;

growInput.addEventListener('input', updateParams);
burnInput.addEventListener('input', updateParams);

function updateParams() {
    pDisplay.textContent = growInput.value;
    fDisplay.textContent = burnInput.value;
    if (worker) {
        worker.postMessage({
            command: 'params',
            probGrow: parseFloat(growInput.value),
            probBurn: parseFloat(burnInput.value)
        });
    }
}

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'frame') {
            render(data.buffer);
            treeCount.textContent = data.trees.toLocaleString();
            fireCount.textContent = data.fires.toLocaleString();
            tickCount.textContent = data.tick;
            // Recycle
            worker.postMessage({ command: 'next', buffer: data.buffer }, [data.buffer]);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        
        const w = 250; // Simulation resolution
        const h = 250;
        canvas.width = w;
        canvas.height = h;
        imageData = ctx.createImageData(w, h);
        
        worker.postMessage({
            command: 'start',
            width: w,
            height: h,
            probTree: parseFloat(treeInput.value),
            probGrow: parseFloat(growInput.value),
            probBurn: parseFloat(burnInput.value)
        });
        
        isRunning = true;
        startBtn.textContent = 'Pause';
        treeInput.disabled = true;
    } else {
        if (isRunning) {
            worker.postMessage({ command: 'pause' });
            isRunning = false;
            startBtn.textContent = 'Resume';
        } else {
            worker.postMessage({ command: 'resume' });
            isRunning = true;
            startBtn.textContent = 'Pause';
        }
    }
});

resetBtn.addEventListener('click', () => {
    if (worker) worker.terminate();
    worker = null;
    isRunning = false;
    startBtn.textContent = 'Start';
    treeInput.disabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    treeCount.textContent = '0';
    fireCount.textContent = '0';
    tickCount.textContent = '0';
});

// Start fire on click
canvas.addEventListener('click', e => {
    if (!worker) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / rect.width * canvas.width);
    const y = Math.floor((e.clientY - rect.top) / rect.height * canvas.height);
    worker.postMessage({ command: 'ignite', x, y });
});

function render(buffer) {
    imageData.data.set(new Uint8ClampedArray(buffer));
    ctx.putImageData(imageData, 0, 0);
}

initWorker();
