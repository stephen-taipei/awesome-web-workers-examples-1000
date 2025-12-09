const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const countSelect = document.getElementById('bodyCount');
const gInput = document.getElementById('gConstant');
const softInput = document.getElementById('softening');

const calcDisplay = document.getElementById('calcPerFrame');
const fpsDisplay = document.getElementById('fpsDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('gravityCanvas');
const ctx = canvas.getContext('2d');

let worker;
let bodies = null; // Float32Array
let lastTime = 0;
let frameCount = 0;

[gInput, softInput].forEach(el => el.addEventListener('input', updateParams));

function updateParams() {
    if (worker) {
        worker.postMessage({
            command: 'params',
            G: parseFloat(gInput.value),
            softening: parseFloat(softInput.value)
        });
    }
}

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'frame') {
            bodies = data.bodies; // Transferable view
            drawBodies();
            measureFPS();
            // Send back buffer to reuse? 
            // To avoid allocation, we can transfer back.
            worker.postMessage({ command: 'next', buffer: bodies.buffer }, [bodies.buffer]);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        const count = parseInt(countSelect.value);
        calcDisplay.textContent = (count * count).toLocaleString();
        statusText.textContent = 'Simulating';
        startBtn.textContent = 'Running...';
        startBtn.disabled = true;
        
        worker.postMessage({
            command: 'init',
            count,
            width: canvas.width,
            height: canvas.height,
            G: parseFloat(gInput.value),
            softening: parseFloat(softInput.value)
        });
    }
});

resetBtn.addEventListener('click', () => {
    if (worker) worker.terminate();
    worker = null;
    statusText.textContent = 'Reset';
    startBtn.textContent = 'Start Simulation';
    startBtn.disabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function drawBodies() {
    // Fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    const count = bodies.length / 4; // x, y, vx, vy
    
    for (let i = 0; i < count; i++) {
        const x = bodies[i*4];
        const y = bodies[i*4+1];
        
        // Simple dot
        // ctx.fillRect(x, y, 2, 2);
        
        // Or colored by velocity?
        const vx = bodies[i*4+2];
        const vy = bodies[i*4+3];
        const v = Math.sqrt(vx*vx + vy*vy);
        
        // Color based on speed
        const intensity = Math.min(255, v * 50);
        ctx.fillStyle = `rgb(${intensity}, ${255-intensity}, 255)`;
        
        if (x > 0 && x < canvas.width && y > 0 && y < canvas.height) {
            ctx.fillRect(x, y, 2, 2);
        }
    }
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
