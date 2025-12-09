const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const freqInput = document.getElementById('sourceFreq');
const matSelect = document.getElementById('material');
const speedInput = document.getElementById('speed');

const freqDisplay = document.getElementById('freqDisplay');
const timeStep = document.getElementById('timeStep');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('fdtdCanvas');
const ctx = canvas.getContext('2d');

let worker;
let isRunning = false;
let imageData;

freqInput.addEventListener('input', () => {
    freqDisplay.textContent = freqInput.value;
    updateParams();
});

matSelect.addEventListener('change', () => {
    if (worker) worker.postMessage({ command: 'material', type: matSelect.value });
});

speedInput.addEventListener('input', updateParams);

function updateParams() {
    if (worker) {
        worker.postMessage({
            command: 'params',
            frequency: parseFloat(freqInput.value),
            speed: parseInt(speedInput.value)
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
            timeStep.textContent = data.step;
            // Recycle
            worker.postMessage({ command: 'next', buffer: data.buffer }, [data.buffer]);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        
        const w = 200; // Sim resolution
        const h = 200;
        canvas.width = w;
        canvas.height = h;
        imageData = ctx.createImageData(w, h);
        
        worker.postMessage({
            command: 'start',
            width: w,
            height: h,
            frequency: parseFloat(freqInput.value),
            material: matSelect.value,
            speed: parseInt(speedInput.value)
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

// Interaction: Draw walls
canvas.addEventListener('mousedown', e => {
    isDrawing = true;
    addWall(e);
});
canvas.addEventListener('mousemove', e => {
    if (isDrawing) addWall(e);
});
window.addEventListener('mouseup', () => isDrawing = false);

let isDrawing = false;
function addWall(e) {
    if (!worker) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / rect.width * canvas.width);
    const y = Math.floor((e.clientY - rect.top) / rect.height * canvas.height);
    worker.postMessage({ command: 'draw', x, y });
}

function render(buffer) {
    imageData.data.set(new Uint8ClampedArray(buffer));
    ctx.putImageData(imageData, 0, 0);
}

initWorker();
