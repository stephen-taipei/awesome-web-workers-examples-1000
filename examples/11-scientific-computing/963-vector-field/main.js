const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const eqUInput = document.getElementById('eqU');
const eqVInput = document.getElementById('eqV');
const countInput = document.getElementById('particleCount');
const countDisplay = document.getElementById('countDisplay');
const stepInput = document.getElementById('stepSize');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('fieldCanvas');
const ctx = canvas.getContext('2d');

let worker;
let isRunning = false;

countInput.addEventListener('input', () => countDisplay.textContent = countInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'update') {
            drawParticles(data.particles);
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            statusText.style.color = '#ef5350';
            startBtn.disabled = false;
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const eqU = eqUInput.value;
    const eqV = eqVInput.value;
    const count = parseInt(countInput.value);
    const dt = parseFloat(stepInput.value);

    // If not running, start
    if (!isRunning) {
        worker.postMessage({
            command: 'start',
            eqU, eqV, count, dt,
            width: 10, // Math domain range +/- 5
            height: 10
        });
        startBtn.textContent = 'Pause';
        statusText.textContent = 'Running';
        statusText.style.color = '#69f0ae';
        isRunning = true;
    } else {
        // Pause logic: we can just terminate or tell it to stop.
        // Terminate is easier for full stop.
        worker.terminate();
        worker = null;
        startBtn.textContent = 'Resume';
        statusText.textContent = 'Paused';
        isRunning = false;
    }
});

resetBtn.addEventListener('click', () => {
    if (worker) worker.terminate();
    worker = null;
    isRunning = false;
    startBtn.textContent = 'Start Simulation';
    statusText.textContent = 'Reset';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function drawParticles(particles) {
    // Fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;
    
    // Map Math Coordinates (-5 to 5) to Canvas (0 to w)
    const mapX = (x) => (x + 5) / 10 * w;
    const mapY = (y) => h - (y + 5) / 10 * h; // Flip Y

    ctx.fillStyle = '#00e676';
    
    for (let i = 0; i < particles.length; i += 2) {
        const x = particles[i];
        const y = particles[i+1];
        
        const cx = mapX(x);
        const cy = mapY(y);
        
        // Wrap around screen visually if needed, but here just drawing points
        if (cx >= 0 && cx <= w && cy >= 0 && cy <= h) {
            ctx.fillRect(cx, cy, 1.5, 1.5);
        }
    }
}

initWorker();
