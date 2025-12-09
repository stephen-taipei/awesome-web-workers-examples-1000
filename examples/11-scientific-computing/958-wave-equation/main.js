const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const dampingInput = document.getElementById('damping');
const freqInput = document.getElementById('frequency');
const dampingDisplay = document.getElementById('dampingDisplay');
const fpsDisplay = document.getElementById('fpsDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('waveCanvas');
const ctx = canvas.getContext('2d');

let worker;
let lastTime = 0;
let frameCount = 0;
let imageData;

dampingInput.addEventListener('input', () => {
    dampingDisplay.textContent = dampingInput.value;
    updateParams();
});

freqInput.addEventListener('input', updateParams);

function updateParams() {
    if (worker) {
        worker.postMessage({
            command: 'params',
            damping: parseFloat(dampingInput.value),
            frequency: parseInt(freqInput.value)
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
            // Send buffer back to recycle memory
            worker.postMessage({ command: 'next', buffer: data.buffer }, [data.buffer]);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        const width = canvas.width;
        const height = canvas.height;
        
        // Init image data for rendering
        imageData = ctx.createImageData(width, height);
        
        worker.postMessage({
            command: 'start',
            width,
            height,
            damping: parseFloat(dampingInput.value),
            frequency: parseInt(freqInput.value)
        });
        
        startBtn.textContent = 'Pause';
        statusText.textContent = 'Running';
    } else {
        worker.terminate();
        worker = null;
        startBtn.textContent = 'Resume';
        statusText.textContent = 'Paused';
    }
});

resetBtn.addEventListener('click', () => {
    if (worker) {
        worker.postMessage({ command: 'reset' });
    }
});

// Interaction
canvas.addEventListener('mousemove', (e) => {
    if (worker && e.buttons === 1) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(e.clientX - rect.left);
        const y = Math.floor(e.clientY - rect.top);
        worker.postMessage({ command: 'disturb', x, y });
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (worker) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor(e.clientX - rect.left);
        const y = Math.floor(e.clientY - rect.top);
        worker.postMessage({ command: 'disturb', x, y });
    }
});

function render(buffer) {
    // buffer is Uint8ClampedArray (RGBA) directly from worker
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
