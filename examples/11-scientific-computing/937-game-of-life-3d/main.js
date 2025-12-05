const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const sizeSelect = document.getElementById('gridSize');
const ruleSelect = document.getElementById('rule');
const speedInput = document.getElementById('speed');

const genCount = document.getElementById('genCount');
const liveCount = document.getElementById('liveCount');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('lifeCanvas');
const ctx = canvas.getContext('2d');

let worker;
let isRunning = false;
let currentCells = []; // Array of {x,y,z}
let rotation = { x: 0.5, y: 0.5 };
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

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

        if (type === 'update') {
            currentCells = data.cells; // Int16Array [x,y,z, x,y,z...]
            genCount.textContent = data.generation;
            liveCount.textContent = data.population;
            draw();
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    if (!isRunning) {
        // If first start or reset
        if (genCount.textContent === '0') {
            worker.postMessage({
                command: 'start',
                size: parseInt(sizeSelect.value),
                rule: ruleSelect.value,
                speed: parseInt(speedInput.value)
            });
        } else {
            worker.postMessage({ command: 'resume' });
        }
        isRunning = true;
        startBtn.textContent = 'Pause';
        statusText.textContent = 'Running';
        sizeSelect.disabled = true;
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
    genCount.textContent = '0';
    liveCount.textContent = '0';
    sizeSelect.disabled = false;
    currentCells = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// 3D Interaction
canvas.addEventListener('mousedown', e => {
    isDragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
});

window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    lastMouse = { x: e.clientX, y: e.clientY };
    
    rotation.y += dx * 0.01;
    rotation.x += dy * 0.01;
    draw();
});

window.addEventListener('mouseup', () => isDragging = false);

function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    if (!currentCells || currentCells.length === 0) return;
    
    const cx = w / 2;
    const cy = h / 2;
    const size = parseInt(sizeSelect.value);
    const scale = 200 / size; // Fit to screen
    
    const cosX = Math.cos(rotation.x), sinX = Math.sin(rotation.x);
    const cosY = Math.cos(rotation.y), sinY = Math.sin(rotation.y);
    
    // Project Points
    const points = [];
    const offset = size / 2;
    
    for (let i = 0; i < currentCells.length; i += 3) {
        let x = currentCells[i] - offset;
        let y = currentCells[i+1] - offset;
        let z = currentCells[i+2] - offset;
        
        // Rotate Y
        let tx = x * cosY - z * sinY;
        let tz = x * sinY + z * cosY;
        x = tx; z = tz;
        
        // Rotate X
        let ty = y * cosX - z * sinX;
        tz = y * sinX + z * cosX;
        y = ty; z = tz;
        
        // Perspective
        const fov = 500;
        const scaleProj = fov / (fov + z * scale);
        
        points.push({
            x: cx + x * scale * scaleProj,
            y: cy + y * scale * scaleProj,
            z: z, // Depth
            scale: scale * scaleProj
        });
    }
    
    // Sort by depth (Painter's)
    points.sort((a, b) => b.z - a.z);
    
    // Draw
    ctx.fillStyle = 'rgba(0, 230, 118, 0.8)';
    ctx.strokeStyle = 'rgba(0, 200, 83, 0.4)';
    
    for (let p of points) {
        const s = Math.max(1, p.scale * 0.8);
        ctx.beginPath();
        // Draw cube-ish rect
        ctx.fillRect(p.x - s/2, p.y - s/2, s, s);
        ctx.strokeRect(p.x - s/2, p.y - s/2, s, s);
    }
}

initWorker();
