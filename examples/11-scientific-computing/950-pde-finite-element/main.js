const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const gridSelect = document.getElementById('gridSize');
const alphaInput = document.getElementById('alpha');
const boundarySelect = document.getElementById('boundary');

const alphaDisplay = document.getElementById('alphaDisplay');
const fpsDisplay = document.getElementById('fpsDisplay');
const avgTempDisplay = document.getElementById('avgTemp');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('heatCanvas');
const ctx = canvas.getContext('2d');

let worker;
let imageData;
let lastTime = 0;
let frameCount = 0;

alphaInput.addEventListener('input', () => {
    alphaDisplay.textContent = alphaInput.value;
    updateParams();
});

boundarySelect.addEventListener('change', updateParams);

function updateParams() {
    if (worker) {
        worker.postMessage({
            command: 'params',
            alpha: parseFloat(alphaInput.value),
            boundary: boundarySelect.value
        });
    }
}

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'frame') {
            render(data.buffer, data.width, data.height);
            avgTempDisplay.textContent = data.avgTemp.toFixed(4);
            measureFPS();
            // Recycle buffer
            worker.postMessage({ command: 'next', buffer: data.buffer }, [data.buffer]);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        const size = parseInt(gridSelect.value);
        
        // Prepare image data
        // We upscale visualization to 500x500, but compute on size x size
        // For direct pixel rendering, best to match or use putImageData and CSS scale
        // Let's render direct pixels and let canvas scale via CSS/Attributes
        
        // Actually main thread will receive a buffer of size*size. 
        // We need to upscale it to canvas 500x500? 
        // Better: let the worker compute a smaller grid, and we draw it stretched.
        
        // Re-set canvas internal resolution to match simulation resolution for performance
        canvas.width = size;
        canvas.height = size;
        imageData = ctx.createImageData(size, size);
        
        worker.postMessage({
            command: 'start',
            size,
            alpha: parseFloat(alphaInput.value),
            boundary: boundarySelect.value
        });
        
        startBtn.textContent = 'Pause';
        statusText.textContent = 'Running';
        gridSelect.disabled = true;
    } else {
        worker.terminate();
        worker = null;
        startBtn.textContent = 'Resume';
        statusText.textContent = 'Paused';
        gridSelect.disabled = false;
    }
});

resetBtn.addEventListener('click', () => {
    if (worker) worker.postMessage({ command: 'reset' });
});

// Interaction: Add Heat
canvas.addEventListener('mousemove', (e) => {
    if (worker && e.buttons === 1) {
        addHeat(e);
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (worker) {
        addHeat(e);
    }
});

function addHeat(e) {
    const rect = canvas.getBoundingClientRect();
    // Map mouse pos to simulation grid
    const x = Math.floor((e.clientX - rect.left) / rect.width * canvas.width);
    const y = Math.floor((e.clientY - rect.top) / rect.height * canvas.height);
    
    worker.postMessage({ command: 'heat', x, y, temp: 1.0, radius: 3 });
}

function render(buffer, w, h) {
    // Buffer is Uint8ClampedArray RGBA
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
