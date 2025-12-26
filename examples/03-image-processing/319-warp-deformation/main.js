// Warp Deformation - Main Thread

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const applyBtn = document.getElementById('applyBtn');
const resetBtn = document.getElementById('resetBtn');
const gridSizeInput = document.getElementById('gridSize');
const gridSizeVal = document.getElementById('gridSizeVal');
const processingTimeEl = document.getElementById('processingTime');

const sourceCanvas = document.getElementById('sourceCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const gridCanvas = document.getElementById('gridCanvas');
const gridCtx = gridCanvas.getContext('2d');
const resultCanvas = document.getElementById('resultCanvas');
const resultCtx = resultCanvas.getContext('2d');
const container = document.getElementById('warpContainer');

let originalImage = null;
let originalImageData = null;
let worker = null;

let cols = 4;
let rows = 4;
let points = []; // Array of {x, y} normalized (0-1)
let isDragging = false;
let activePointIndex = -1;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        if (e.data.type === 'result') {
            const { imageData, width, height, executionTime } = e.data;
            resultCanvas.width = width;
            resultCanvas.height = height;
            resultCtx.putImageData(new ImageData(new Uint8ClampedArray(imageData), width, height), 0, 0);
            processingTimeEl.textContent = `Time: ${executionTime.toFixed(2)}ms`;
            applyBtn.disabled = false;
        }
    };
}

function initGrid(c, r) {
    cols = c;
    rows = r;
    points = [];
    for (let y = 0; y <= rows; y++) {
        for (let x = 0; x <= cols; x++) {
            points.push({
                x: x / cols,
                y: y / rows,
                origX: x / cols,
                origY: y / rows
            });
        }
    }
    drawGrid();
}

function drawGrid() {
    gridCanvas.width = sourceCanvas.clientWidth;
    gridCanvas.height = sourceCanvas.clientHeight;
    const w = gridCanvas.width;
    const h = gridCanvas.height;

    gridCtx.clearRect(0, 0, w, h);

    // Draw edges
    gridCtx.beginPath();
    gridCtx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
    gridCtx.lineWidth = 1;

    // Horizontal lines
    for (let y = 0; y <= rows; y++) {
        for (let x = 0; x < cols; x++) {
            const p1 = points[y * (cols + 1) + x];
            const p2 = points[y * (cols + 1) + x + 1];
            gridCtx.moveTo(p1.x * w, p1.y * h);
            gridCtx.lineTo(p2.x * w, p2.y * h);
        }
    }

    // Vertical lines
    for (let x = 0; x <= cols; x++) {
        for (let y = 0; y < rows; y++) {
            const p1 = points[y * (cols + 1) + x];
            const p2 = points[(y + 1) * (cols + 1) + x];
            gridCtx.moveTo(p1.x * w, p1.y * h);
            gridCtx.lineTo(p2.x * w, p2.y * h);
        }
    }
    gridCtx.stroke();

    // Draw Points
    points.forEach(p => {
        gridCtx.beginPath();
        gridCtx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
        gridCtx.fillStyle = '#10b981';
        gridCtx.fill();
        gridCtx.strokeStyle = '#fff';
        gridCtx.stroke();
    });
}

function handleImageLoad(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const maxD = 600;
            let w = img.width;
            let h = img.height;
            if (w > maxD || h > maxD) {
                const r = Math.min(maxD/w, maxD/h);
                w = Math.round(w*r);
                h = Math.round(h*r);
            }

            sourceCanvas.width = w;
            sourceCanvas.height = h;
            sourceCtx.drawImage(img, 0, 0, w, h);
            originalImageData = sourceCtx.getImageData(0, 0, w, h);

            originalImage = img;
            initGrid(parseInt(gridSizeInput.value), parseInt(gridSizeInput.value));
            applyBtn.disabled = false;

            resultCanvas.width = w;
            resultCanvas.height = h;
            resultCtx.clearRect(0, 0, w, h);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Interaction
gridCanvas.addEventListener('mousedown', (e) => {
    const rect = gridCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Find closest point
    let minDist = 0.05; // Threshold
    activePointIndex = -1;

    points.forEach((p, i) => {
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minDist) {
            minDist = dist;
            activePointIndex = i;
        }
    });

    if (activePointIndex !== -1) {
        isDragging = true;
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isDragging || activePointIndex === -1) return;
    const rect = gridCanvas.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width;
    let y = (e.clientY - rect.top) / rect.height;

    // Clamp
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    points[activePointIndex].x = x;
    points[activePointIndex].y = y;

    drawGrid();
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    activePointIndex = -1;
});

gridSizeInput.addEventListener('input', () => {
    const s = gridSizeInput.value;
    gridSizeVal.textContent = `${s}x${s}`;
    if (originalImage) {
        initGrid(parseInt(s), parseInt(s));
    }
});

applyBtn.addEventListener('click', () => {
    if (!originalImageData) return;

    applyBtn.disabled = true;
    processingTimeEl.textContent = 'Processing...';

    worker.postMessage({
        type: 'warp',
        imageData: originalImageData,
        points: points,
        cols: cols,
        rows: rows
    });
});

resetBtn.addEventListener('click', () => {
    if (originalImage) {
        initGrid(parseInt(gridSizeInput.value), parseInt(gridSizeInput.value));
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    }
});

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleImageLoad(e.target.files[0]);
});

window.addEventListener('resize', () => {
    if (originalImage) drawGrid();
});

initWorker();
