const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const viscInput = document.getElementById('viscosity');
const barrierSelect = document.getElementById('barrierType');
const speedInput = document.getElementById('inletSpeed');
const contrastInput = document.getElementById('contrast');

const viscDisplay = document.getElementById('viscDisplay');
const fpsDisplay = document.getElementById('fpsDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('fluidCanvas');
const ctx = canvas.getContext('2d');

let worker;
let imageData;
let isRunning = false;
let lastTime = 0;
let frameCount = 0;

viscInput.addEventListener('input', () => {
    viscDisplay.textContent = viscInput.value;
    updateParams();
});

barrierSelect.addEventListener('change', () => {
    if (worker) worker.postMessage({ command: 'barrier', type: barrierSelect.value });
});

speedInput.addEventListener('input', updateParams);
contrastInput.addEventListener('input', updateParams);

function updateParams() {
    if (worker) {
        worker.postMessage({
            command: 'params',
            viscosity: parseFloat(viscInput.value),
            inletSpeed: parseFloat(speedInput.value),
            contrast: parseFloat(contrastInput.value)
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
            measureFPS();
            // Recycle
            worker.postMessage({ command: 'next', buffer: data.buffer }, [data.buffer]);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        
        const w = canvas.width; // 400
        const h = canvas.height; // 200
        imageData = ctx.createImageData(w, h);
        
        worker.postMessage({
            command: 'start',
            width: w,
            height: h,
            viscosity: parseFloat(viscInput.value),
            inletSpeed: parseFloat(speedInput.value),
            barrierType: barrierSelect.value
        });
        
        isRunning = true;
        startBtn.textContent = 'Pause';
        statusText.textContent = 'Running';
    } else {
        if (isRunning) {
            worker.postMessage({ command: 'pause' });
            isRunning = false;
            startBtn.textContent = 'Resume';
            statusText.textContent = 'Paused';
        } else {
            worker.postMessage({ command: 'resume' });
            isRunning = true;
            startBtn.textContent = 'Pause';
            statusText.textContent = 'Running';
        }
    }
});

resetBtn.addEventListener('click', () => {
    if (worker) worker.postMessage({ command: 'reset' });
});

// Mouse Interaction (Draw Barrier)
let isDrawing = false;
canvas.addEventListener('mousedown', e => { isDrawing = true; addBarrier(e); });
canvas.addEventListener('mousemove', e => { if (isDrawing) addBarrier(e); });
window.addEventListener('mouseup', () => isDrawing = false);

function addBarrier(e) {
    if (!worker) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / rect.width * canvas.width);
    const y = Math.floor((e.clientY - rect.top) / rect.height * canvas.height);
    
    worker.postMessage({ command: 'drawBarrier', x, y, radius: 5 });
}

function render(buffer) {
    imageData.data.set(new Uint8ClampedArray(buffer));
    ctx.putImageData(imageData, 0, 0);
}

function measureFPS() {
    const now = performance.now();
    frameCount++;
    if (now - lastTime >= 1000) {
        fpsDisplay.textContent = frameCount;
        frameCount = 0;
        lastTime = now;
    }
}

initWorker();
