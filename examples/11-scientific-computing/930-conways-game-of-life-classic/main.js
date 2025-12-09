const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const sizeSelect = document.getElementById('gridSize');
const densityInput = document.getElementById('density');
const speedInput = document.getElementById('speed');

const genDisplay = document.getElementById('genDisplay');
const popDisplay = document.getElementById('popDisplay');
const fpsDisplay = document.getElementById('fpsDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('lifeCanvas');
const ctx = canvas.getContext('2d');

let worker;
let isRunning = false;
let imageData;
let lastTime = 0;
let frameCount = 0;

speedInput.addEventListener('input', () => {
    if (worker) worker.postMessage({ command: 'params', speed: parseInt(speedInput.value) });
});

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'frame') {
            render(data.buffer, data.size);
            genDisplay.textContent = data.generation;
            popDisplay.textContent = data.population.toLocaleString();
            measureFPS();
            // Recycle buffer
            worker.postMessage({ command: 'next', buffer: data.buffer }, [data.buffer]);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    if (!isRunning) {
        if (statusText.textContent === 'Idle' || statusText.textContent === 'Reset') {
            const size = parseInt(sizeSelect.value);
            canvas.width = size;
            canvas.height = size;
            imageData = ctx.createImageData(size, size);
            
            worker.postMessage({
                command: 'start',
                size,
                density: parseFloat(densityInput.value),
                speed: parseInt(speedInput.value)
            });
            sizeSelect.disabled = true;
        } else {
            worker.postMessage({ command: 'resume' });
        }
        
        isRunning = true;
        startBtn.textContent = 'Pause';
        statusText.textContent = 'Running';
    } else {
        worker.postMessage({ command: 'pause' });
        isRunning = false;
        startBtn.textContent = 'Resume';
        statusText.textContent = 'Paused';
    }
});

resetBtn.addEventListener('click', () => {
    if (worker) worker.terminate();
    worker = null;
    isRunning = false;
    startBtn.textContent = 'Start';
    statusText.textContent = 'Reset';
    genDisplay.textContent = '0';
    popDisplay.textContent = '0';
    sizeSelect.disabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Interaction: Draw on canvas
canvas.addEventListener('mousedown', e => {
    if (!worker) return;
    drawCell(e);
    canvas.addEventListener('mousemove', drawCell);
});

window.addEventListener('mouseup', () => {
    canvas.removeEventListener('mousemove', drawCell);
});

function drawCell(e) {
    if (!worker) return;
    const rect = canvas.getBoundingClientRect();
    // Map to grid coords
    const size = parseInt(sizeSelect.value);
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * size);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * size);
    
    worker.postMessage({ command: 'draw', x, y });
}

function render(buffer, size) {
    // buffer is Uint8 array (0 or 1)
    // We need to convert to RGBA for putImageData
    // Or worker sends RGBA buffer?
    // Worker sends RGBA buffer for zero-copy speed.
    
    imageData.data.set(new Uint8ClampedArray(buffer));
    
    // Draw to canvas (which is size x size)
    // CSS scales it to 500x500
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
