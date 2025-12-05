const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const viscInput = document.getElementById('viscosity');
const diffInput = document.getElementById('diffusion');
const iterInput = document.getElementById('iterations');
const iterDisplay = document.getElementById('iterDisplay');
const fpsDisplay = document.getElementById('fpsDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('fluidCanvas');
const ctx = canvas.getContext('2d');

let worker;
let isRunning = false;
let imageData;
let lastTime = 0;
let frameCount = 0;

iterInput.addEventListener('input', () => {
    iterDisplay.textContent = iterInput.value;
    updateParams();
});

viscInput.addEventListener('input', updateParams);
diffInput.addEventListener('input', updateParams);

function updateParams() {
    if (worker) {
        worker.postMessage({
            command: 'params',
            viscosity: parseFloat(viscInput.value),
            diffusion: parseFloat(diffInput.value),
            iterations: parseInt(iterInput.value)
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
            worker.postMessage({ command: 'next', buffer: data.buffer }, [data.buffer]);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        
        const size = 128; // Simulation Grid Resolution (smaller than canvas for speed)
        imageData = ctx.createImageData(size, size);
        
        // Scale canvas rendering
        // We render low res image stretched
        
        worker.postMessage({
            command: 'start',
            size: size,
            viscosity: parseFloat(viscInput.value),
            diffusion: parseFloat(diffInput.value),
            iterations: parseInt(iterInput.value)
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

// Interaction
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

canvas.addEventListener('mousedown', e => {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    lastMouse = { x: e.clientX - rect.left, y: e.clientY - rect.top };
});

window.addEventListener('mousemove', e => {
    if (!worker || !isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;
    
    // Map to grid size (128)
    // And calculate velocity delta
    
    const scaleX = 128 / rect.width;
    const scaleY = 128 / rect.height;
    
    const gx = Math.floor(x * scaleX);
    const gy = Math.floor(y * scaleY);
    const u = (x - lastMouse.x) * 5; // Scale force
    const v = (y - lastMouse.y) * 5;
    
    worker.postMessage({
        command: 'interact',
        x: gx, y: gy, u, v
    });
    
    lastMouse = { x, y };
});

window.addEventListener('mouseup', () => isDragging = false);

function render(buffer) {
    // buffer is size*size*4
    // We put it into a temp canvas and draw scaled up?
    // Simplest: Put image data into a 128x128 bitmap, draw to 500x500 canvas
    
    // Create temp canvas for scaling (if not exists)
    if (!window.tempCanvas) {
        window.tempCanvas = document.createElement('canvas');
        window.tempCanvas.width = 128;
        window.tempCanvas.height = 128;
        window.tempCtx = window.tempCanvas.getContext('2d');
    }
    
    const id = new ImageData(new Uint8ClampedArray(buffer), 128, 128);
    window.tempCtx.putImageData(id, 0, 0);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Smooth scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high'; // Or low for pixel art style
    ctx.drawImage(window.tempCanvas, 0, 0, canvas.width, canvas.height);
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
