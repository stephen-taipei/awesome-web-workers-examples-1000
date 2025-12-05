const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const batchSelect = document.getElementById('particleCount');
const stickInput = document.getElementById('stickiness');
const colorSelect = document.getElementById('colorMode');

const stickDisplay = document.getElementById('stickDisplay');
const countDisplay = document.getElementById('countDisplay');
const radiusDisplay = document.getElementById('radiusDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('dlaCanvas');
const ctx = canvas.getContext('2d');

let worker;
let isRunning = false;
let imageData;

stickInput.addEventListener('input', () => {
    stickDisplay.textContent = stickInput.value;
    if (worker) worker.postMessage({ command: 'params', stickiness: parseFloat(stickInput.value) });
});

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'batch') {
            // data.newPoints is array of {x, y, id}
            drawPoints(data.newPoints, data.totalCount);
            countDisplay.textContent = data.totalCount.toLocaleString();
            radiusDisplay.textContent = data.maxRadius.toFixed(1);
            
            if (data.totalCount >= 50000) { // Stop condition example
                stop();
                statusText.textContent = 'Finished (Limit Reached)';
            } else {
                // Request next batch
                if (isRunning) worker.postMessage({ command: 'next' });
            }
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Initial Seed (Center)
        ctx.fillStyle = '#fff';
        ctx.fillRect(250, 250, 1, 1);
        
        worker.postMessage({
            command: 'start',
            width: canvas.width,
            height: canvas.height,
            batchSize: parseInt(batchSelect.value),
            stickiness: parseFloat(stickInput.value)
        });
        
        isRunning = true;
        startBtn.textContent = 'Pause';
        statusText.textContent = 'Growing...';
    } else {
        if (isRunning) {
            isRunning = false;
            startBtn.textContent = 'Resume';
            statusText.textContent = 'Paused';
        } else {
            isRunning = true;
            worker.postMessage({ command: 'next' });
            startBtn.textContent = 'Pause';
            statusText.textContent = 'Growing...';
        }
    }
});

resetBtn.addEventListener('click', () => {
    if (worker) worker.terminate();
    worker = null;
    isRunning = false;
    startBtn.textContent = 'Start Growth';
    statusText.textContent = 'Reset';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    countDisplay.textContent = '0';
    radiusDisplay.textContent = '0';
});

function drawPoints(points, totalCount) {
    const mode = colorSelect.value;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    for (let p of points) {
        let color = '#fff';
        
        if (mode === 'time') {
            // Hue shifts with time (id)
            const hue = (p.id / 50) % 360;
            color = `hsl(${hue}, 80%, 50%)`;
        } else if (mode === 'distance') {
            // Hue shifts with distance from center
            const dx = p.x - cx;
            const dy = p.y - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const hue = (dist * 2) % 360;
            color = `hsl(${hue}, 80%, 60%)`;
        }
        
        ctx.fillStyle = color;
        ctx.fillRect(p.x, p.y, 1, 1);
    }
}

initWorker();
