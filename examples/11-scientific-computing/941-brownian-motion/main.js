const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const countSelect = document.getElementById('particleCount');
const speedInput = document.getElementById('speed');
const trailsCheck = document.getElementById('trails');

const stepCountEl = document.getElementById('stepCount');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('motionCanvas');
const ctx = canvas.getContext('2d');

let worker;
let isRunning = false;

speedInput.addEventListener('input', updateParams);

function updateParams() {
    if (worker) {
        worker.postMessage({
            command: 'params',
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
            draw(data.particles);
            stepCountEl.textContent = data.step;
            // Recycle
            worker.postMessage({ command: 'next', buffer: data.particles.buffer }, [data.particles.buffer]);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        const count = parseInt(countSelect.value);
        
        statusText.textContent = 'Running';
        startBtn.textContent = 'Pause';
        
        worker.postMessage({
            command: 'start',
            count,
            width: canvas.width,
            height: canvas.height,
            speed: parseInt(speedInput.value)
        });
    } else {
        worker.terminate();
        worker = null;
        statusText.textContent = 'Paused';
        startBtn.textContent = 'Resume';
    }
});

resetBtn.addEventListener('click', () => {
    if (worker) worker.terminate();
    worker = null;
    statusText.textContent = 'Reset';
    startBtn.textContent = 'Start Simulation';
    stepCountEl.textContent = '0';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function draw(particles) {
    // Fade effect for trails
    if (trailsCheck.checked) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = '#4dd0e1';
    
    const count = particles.length / 2;
    for (let i = 0; i < count; i++) {
        const x = particles[i*2];
        const y = particles[i*2+1];
        ctx.fillRect(x, y, 2, 2);
    }
}

initWorker();
