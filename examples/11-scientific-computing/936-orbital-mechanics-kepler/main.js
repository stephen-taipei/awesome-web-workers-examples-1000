const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const eccInput = document.getElementById('eccentricity');
const semiMajorInput = document.getElementById('semiMajor');
const speedInput = document.getElementById('speed');

const eDisplay = document.getElementById('eDisplay');
const aDisplay = document.getElementById('aDisplay');
const meanAnom = document.getElementById('meanAnom');
const trueAnom = document.getElementById('trueAnom');
const radiusVal = document.getElementById('radiusVal');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('orbitCanvas');
const ctx = canvas.getContext('2d');

let worker;
let currentPos = { r: 0, v: 0 };
let orbitPath = [];

eccInput.addEventListener('input', () => {
    eDisplay.textContent = eccInput.value;
    updateParams();
});

semiMajorInput.addEventListener('input', () => {
    aDisplay.textContent = semiMajorInput.value;
    updateParams();
});

speedInput.addEventListener('input', updateParams);

function updateParams() {
    if (worker) {
        worker.postMessage({
            command: 'params',
            e: parseFloat(eccInput.value),
            a: parseFloat(semiMajorInput.value),
            speed: parseFloat(speedInput.value)
        });
        // Clear path on param change
        orbitPath = [];
    }
}

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'update') {
            currentPos = data; // r, v, M
            meanAnom.textContent = data.M.toFixed(2);
            trueAnom.textContent = data.v.toFixed(2);
            radiusVal.textContent = data.r.toFixed(2);
            
            // Store path for trail
            // Need to calculate x, y here or in worker.
            // Worker sends polar (r, v) usually.
            // Convert polar (r, v) to cartesian
            // Ellipse center is at focal point? No, Kepler orbits: Sun at one focus.
            // x = r * cos(v), y = r * sin(v)
            const x = data.r * Math.cos(data.v);
            const y = data.r * Math.sin(data.v);
            orbitPath.push({x, y});
            
            if (orbitPath.length > 500) orbitPath.shift();
            
            drawOrbit(x, y);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        const e = parseFloat(eccInput.value);
        const a = parseFloat(semiMajorInput.value);
        const speed = parseFloat(speedInput.value);
        
        startBtn.disabled = true;
        stopBtn.disabled = false;
        statusText.textContent = 'Running';
        orbitPath = [];
        
        worker.postMessage({
            command: 'start',
            e, a, speed
        });
    }
});

stopBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        worker = null;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        statusText.textContent = 'Stopped';
    }
});

function drawOrbit(planetX, planetY) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    const cx = w / 2;
    const cy = h / 2;
    
    // Draw Sun (Focus)
    ctx.fillStyle = '#ffeb3b';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#fdd835';
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Draw Path
    ctx.strokeStyle = 'rgba(64, 196, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (orbitPath.length > 0) {
        const start = orbitPath[0];
        ctx.moveTo(cx + start.x, cy - start.y); // Flip Y
        for (let i = 1; i < orbitPath.length; i++) {
            const p = orbitPath[i];
            ctx.lineTo(cx + p.x, cy - p.y);
        }
    }
    ctx.stroke();
    
    // Draw Planet
    ctx.fillStyle = '#40c4ff';
    ctx.beginPath();
    ctx.arc(cx + planetX, cy - planetY, 6, 0, Math.PI * 2);
    ctx.fill();
}

initWorker();
