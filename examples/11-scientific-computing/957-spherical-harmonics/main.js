const renderBtn = document.getElementById('renderBtn');
const degreeInput = document.getElementById('degreeL');
const orderInput = document.getElementById('orderM');
const resSelect = document.getElementById('resolution');

const lDisplay = document.getElementById('lDisplay');
const mDisplay = document.getElementById('mDisplay');
const vertCount = document.getElementById('vertCount');
const calcTime = document.getElementById('calcTime');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('shCanvas');
const ctx = canvas.getContext('2d');

let worker;
let currentMesh = null;
let rotation = { x: 0, y: 0 };
let isDragging = false;
let lastMouse = { x: 0, y: 0 };

// Update labels
degreeInput.addEventListener('input', () => {
    lDisplay.textContent = degreeInput.value;
    // m cannot be greater than l
    if (parseInt(orderInput.value) > parseInt(degreeInput.value)) {
        orderInput.value = degreeInput.value;
        mDisplay.textContent = degreeInput.value;
    }
    orderInput.max = degreeInput.value;
});

orderInput.addEventListener('input', () => mDisplay.textContent = orderInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Rendering';
            calcTime.textContent = `${data.duration}ms`;
            vertCount.textContent = data.vertices.length;
            currentMesh = data; // Store mesh
            draw();
            renderBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            renderBtn.disabled = false;
        }
    };
}

renderBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const l = parseInt(degreeInput.value);
    const m = parseInt(orderInput.value);
    const res = parseInt(resSelect.value);

    renderBtn.disabled = true;
    statusText.textContent = 'Computing...';
    calcTime.textContent = '-';
    
    worker.postMessage({
        command: 'compute',
        l, m, res
    });
});

// Canvas Interaction
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
    if (!currentMesh) return;
    
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    const cx = w / 2;
    const cy = h / 2;
    const scale = 150; // Zoom

    // Simple 3D Projection
    // Rotate -> Project -> Draw
    
    const vertices = currentMesh.vertices;
    const projected = [];
    
    const cosX = Math.cos(rotation.x), sinX = Math.sin(rotation.x);
    const cosY = Math.cos(rotation.y), sinY = Math.sin(rotation.y);

    for (let i = 0; i < vertices.length; i++) {
        let x = vertices[i].x;
        let y = vertices[i].y;
        let z = vertices[i].z;
        const val = vertices[i].val; // Magnitude for color

        // Rotate Y
        let tx = x * cosY - z * sinY;
        let tz = x * sinY + z * cosY;
        x = tx; z = tz;

        // Rotate X
        let ty = y * cosX - z * sinX;
        tz = y * sinX + z * cosX;
        y = ty; z = tz;

        // Project
        // Weak perspective
        projected.push({
            x: cx + x * scale,
            y: cy - y * scale,
            z: z,
            val: val
        });
    }

    // Draw Points (Simple Point Cloud)
    // Sort by Z for painters algo
    // For mesh wireframe we'd need faces, but point cloud is simpler for this demo
    // and looks cool for SH shapes.
    
    projected.sort((a, b) => b.z - a.z); // Draw back first

    for (let p of projected) {
        const size = Math.max(1, (p.z + 2) * 1.5); // Depth scaling
        
        // Color map: Blue (-) -> White (0) -> Red (+)
        // val is typically real part of Ylm or magnitude.
        // We'll assume val is normalized or raw.
        // Ylm values are small usually.
        
        const v = p.val; 
        // Map -0.5 to 0.5 roughly
        let r=0, g=0, b=0;
        
        if (v > 0) {
            r = Math.min(255, v * 500);
            g = Math.max(0, 200 - v * 200);
            b = Math.max(0, 200 - v * 200);
        } else {
            r = Math.max(0, 200 + v * 200);
            g = Math.max(0, 200 + v * 200);
            b = Math.min(255, -v * 500);
        }
        
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(p.x, p.y, size, size);
    }
}

initWorker();
renderBtn.click();
