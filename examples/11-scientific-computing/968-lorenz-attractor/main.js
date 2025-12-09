const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const sigmaInput = document.getElementById('sigma');
const rhoInput = document.getElementById('rho');
const betaInput = document.getElementById('beta');
const speedInput = document.getElementById('speed');

const sigmaDisplay = document.getElementById('sigmaDisplay');
const rhoDisplay = document.getElementById('rhoDisplay');
const betaDisplay = document.getElementById('betaDisplay');
const pointCountEl = document.getElementById('pointCount');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('lorenzCanvas');
const ctx = canvas.getContext('2d');

let worker;
let points = [];
let angle = 0;

sigmaInput.addEventListener('input', () => sigmaDisplay.textContent = sigmaInput.value);
rhoInput.addEventListener('input', () => rhoDisplay.textContent = rhoInput.value);
betaInput.addEventListener('input', () => betaDisplay.textContent = betaInput.value);

// Update params live
[sigmaInput, rhoInput, betaInput, speedInput].forEach(input => {
    input.addEventListener('input', updateParams);
});

function updateParams() {
    if (worker) {
        worker.postMessage({
            command: 'update',
            sigma: parseFloat(sigmaInput.value),
            rho: parseFloat(rhoInput.value),
            beta: parseFloat(betaInput.value),
            stepsPerFrame: parseInt(speedInput.value)
        });
    }
}

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'points') {
            // Add new points to buffer
            // Limit buffer size to avoid memory issues? 
            // Let's keep 2000 for tail effect or infinite?
            // Infinite trails get messy. Let's keep max 5000.
            
            const newPoints = data; // Array of {x, y, z}
            
            for(let p of newPoints) {
                points.push(p);
            }
            if (points.length > 3000) {
                points.splice(0, points.length - 3000);
            }
            
            pointCountEl.textContent = points.length;
        }
    };
    
    // Initial Params
    updateParams();
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        worker.postMessage({ command: 'start' });
        statusText.textContent = 'Running';
        startBtn.textContent = 'Pause';
        animate();
    } else {
        // Toggle? Simpler to just have Stop/Start logic or Pause.
        // For now, let's restart if clicked again or ignore.
        // Let's implement pause logic by terminating.
        worker.terminate();
        worker = null;
        statusText.textContent = 'Paused';
        startBtn.textContent = 'Resume';
    }
});

resetBtn.addEventListener('click', () => {
    if (worker) worker.terminate();
    worker = null;
    points = [];
    initWorker();
    statusText.textContent = 'Reset';
    startBtn.textContent = 'Start';
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});

function animate() {
    if (!worker) return; // Stop animation loop if worker killed
    
    requestAnimationFrame(animate);
    
    // Clear with fade effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Trail effect
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    angle += 0.005; // Rotation
    
    ctx.strokeStyle = '#ffab00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    // 3D Projection
    // Simple weak perspective or orthographic
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = 8;
    
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        
        // Rotate around Z axis? Lorenz is 3D.
        // Let's rotate around Y axis.
        const x = p.x * Math.cos(angle) - p.z * Math.sin(angle);
        const z = p.x * Math.sin(angle) + p.z * Math.cos(angle);
        const y = p.y;
        
        // Project
        const px = cx + x * scale;
        const py = cy + (y - 20) * scale; // Translate Y to center visually
        
        // Color based on index (fade) or z-depth?
        // Single path for speed.
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();
}

// Initial clear
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);
