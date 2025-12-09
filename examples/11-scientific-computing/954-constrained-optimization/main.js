const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const penaltyInput = document.getElementById('penaltyStart');
const lrInput = document.getElementById('learningRate');
const lrDisplay = document.getElementById('lrDisplay');

const iterDisplay = document.getElementById('iterDisplay');
const posDisplay = document.getElementById('posDisplay');
const costDisplay = document.getElementById('costDisplay');
const penaltyDisplay = document.getElementById('penaltyDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('optCanvas');
const ctx = canvas.getContext('2d');

let worker;
let path = [];

lrInput.addEventListener('input', () => lrDisplay.textContent = lrInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'step') {
            path.push(data.pos);
            draw(path);
            
            iterDisplay.textContent = data.iter;
            posDisplay.textContent = `(${data.pos.x.toFixed(3)}, ${data.pos.y.toFixed(3)})`;
            costDisplay.textContent = data.cost.toFixed(4);
            penaltyDisplay.textContent = data.penaltyWeight.toFixed(1);
        } else if (type === 'done') {
            statusText.textContent = 'Converged / Stopped';
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const rho = parseFloat(penaltyInput.value);
    const lr = parseFloat(lrInput.value);

    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = 'Optimizing...';
    path = [];

    worker.postMessage({
        command: 'start',
        rho, lr
    });
});

stopBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        worker = null;
        statusText.textContent = 'Stopped';
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
});

function draw(points) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // Coordinate System: Center (0,0) at (w/2, h/2)
    // Scale: 50px = 1 unit
    const scale = 50;
    const cx = w / 2;
    const cy = h / 2;
    
    const mapX = (x) => cx + x * scale;
    const mapY = (y) => cy - y * scale; // Flip Y

    // Draw Grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(0, cy); ctx.lineTo(w, cy); // X Axis
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h); // Y Axis
    ctx.stroke();

    // Draw Constraint Boundary (Unit Circle)
    // x^2 + y^2 <= 1
    ctx.strokeStyle = '#aaa';
    ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, 1 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw Unconstrained Target (2, 2)
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.arc(mapX(2), mapY(2), 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw Path
    if (points.length > 0) {
        ctx.strokeStyle = '#ffcc80';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mapX(points[0].x), mapY(points[0].y));
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(mapX(points[i].x), mapY(points[i].y));
        }
        ctx.stroke();

        // Start Point
        ctx.fillStyle = '#29b6f6';
        ctx.beginPath();
        ctx.arc(mapX(points[0].x), mapY(points[0].y), 5, 0, Math.PI*2);
        ctx.fill();

        // Current Point
        const last = points[points.length-1];
        ctx.fillStyle = '#e65100';
        ctx.beginPath();
        ctx.arc(mapX(last.x), mapY(last.y), 5, 0, Math.PI*2);
        ctx.fill();
    }
}

initWorker();
draw([{x: -2, y: -2}]); // Initial draw
