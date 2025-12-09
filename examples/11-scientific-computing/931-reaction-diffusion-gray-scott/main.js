const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const feedInput = document.getElementById('feedRate');
const killInput = document.getElementById('killRate');
const speedInput = document.getElementById('speed');
const presetSelect = document.getElementById('preset');

const fDisplay = document.getElementById('fDisplay');
const kDisplay = document.getElementById('kDisplay');
const fpsDisplay = document.getElementById('fpsDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('rdCanvas');
const ctx = canvas.getContext('2d');

let worker;
let isRunning = false;
let imageData;
let lastTime = 0;
let frameCount = 0;

feedInput.addEventListener('input', () => {
    fDisplay.textContent = feedInput.value;
    updateParams();
});

killInput.addEventListener('input', () => {
    kDisplay.textContent = killInput.value;
    updateParams();
});

speedInput.addEventListener('input', updateParams);

presetSelect.addEventListener('change', () => {
    let f, k;
    switch (presetSelect.value) {
        case 'default': f=0.055; k=0.062; break;
        case 'mitosis': f=0.0367; k=0.0649; break;
        case 'worms':   f=0.0545; k=0.062; break;
        case 'spots':   f=0.025; k=0.060; break;
    }
    feedInput.value = f;
    killInput.value = k;
    fDisplay.textContent = f;
    kDisplay.textContent = k;
    updateParams();
});

function updateParams() {
    if (worker) {
        worker.postMessage({
            command: 'params',
            feed: parseFloat(feedInput.value),
            kill: parseFloat(killInput.value),
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
            measureFPS();
            // Recycle buffer
            worker.postMessage({ command: 'next', buffer: data.buffer }, [data.buffer]);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        
        const w = canvas.width;
        const h = canvas.height;
        imageData = ctx.createImageData(w, h);
        
        worker.postMessage({
            command: 'start',
            width: w,
            height: h,
            feed: parseFloat(feedInput.value),
            kill: parseFloat(killInput.value),
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

// Paint chemicals
canvas.addEventListener('mousedown', addChemicals);
canvas.addEventListener('mousemove', e => {
    if (e.buttons === 1) addChemicals(e);
});

function addChemicals(e) {
    if (!worker) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / rect.width * canvas.width);
    const y = Math.floor((e.clientY - rect.top) / rect.height * canvas.height);
    
    worker.postMessage({ command: 'paint', x, y, radius: 5 });
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
