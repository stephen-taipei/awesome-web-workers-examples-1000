const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const batchSizeSelect = document.getElementById('batchSize');
const totalPointsEl = document.getElementById('totalPoints');
const insidePointsEl = document.getElementById('insidePoints');
const piEstimateEl = document.getElementById('piEstimate');
const piErrorEl = document.getElementById('piError');
const canvas = document.getElementById('mcCanvas');
const ctx = canvas.getContext('2d');

let worker;
let isRunning = false;

// Setup Canvas
const width = canvas.width;
const height = canvas.height;
const centerX = width / 2;
const centerY = height / 2;
const radius = width / 2 - 10; // Padding

function clearCanvas() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Draw Circle Boundary
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#4db6ac';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw Square Boundary
    ctx.beginPath();
    ctx.rect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    ctx.strokeStyle = '#546e7a';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'update') {
            const { total, inside, points, estimate } = data;
            
            totalPointsEl.textContent = total.toLocaleString();
            insidePointsEl.textContent = inside.toLocaleString();
            piEstimateEl.textContent = estimate.toFixed(7);
            
            const error = Math.abs((estimate - Math.PI) / Math.PI) * 100;
            piErrorEl.textContent = error.toFixed(4);
            
            drawPoints(points);
        } else if (type === 'stopped') {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            isRunning = false;
        }
    };
}

function drawPoints(points) {
    // points is an Uint8Array of [x, y, status, x, y, status...] 
    // status: 1=inside, 0=outside
    // Coordinates are normalized 0-255 for compression in worker? 
    // Or we just pass raw float32 if performance allows.
    // Let's check worker implementation. Assuming raw coords 0-1.
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const buf = imageData.data;
    
    // We only want to draw NEW points. 
    // But `points` from worker might be just the batch.
    // Drawing pixels manually is faster for thousands of points.
    
    for (let i = 0; i < points.length; i += 3) {
        const x = points[i];
        const y = points[i+1];
        const inside = points[i+2];
        
        // Map -1..1 to canvas
        const cx = Math.floor((x + 1) / 2 * (radius * 2) + (centerX - radius));
        const cy = Math.floor((y + 1) / 2 * (radius * 2) + (centerY - radius));
        
        if (cx >= 0 && cx < width && cy >= 0 && cy < height) {
            const idx = (cy * width + cx) * 4;
            if (inside) {
                // Cyan for inside
                buf[idx] = 77;
                buf[idx+1] = 182;
                buf[idx+2] = 172;
                buf[idx+3] = 255;
            } else {
                // Red/Grey for outside
                buf[idx] = 239;
                buf[idx+1] = 83;
                buf[idx+2] = 80;
                buf[idx+3] = 100; // Semi-transparent
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

// We actually want to compositing new points on top of old image.
// putImageData overwrites. 
// Better approach: Draw on an offscreen canvas or just use fillRect for small batches?
// For 100k points, pixel manipulation is best.
// To preserve old points, we need to read current canvas state? No, that's slow.
// We can keep a persistent ImageData buffer in main thread?
// Or just rely on the fact that we don't clear the canvas between updates.
// ctx.putImageData replaces the whole rect.
// If we want to ADD points, we should use `fillRect` (1x1) or maintain a full-screen buffer.
// Let's use `fillRect` for visual simplicity if batch is < 10000.
// If batch > 10000, `fillRect` is slow.
// Hybrid: Worker sends a batch. We draw the batch.
// Optimized Draw:
// 1. Get existing image data is slow.
// 2. Just drawing 1x1 rects is reasonably fast for < 5000 points.
// 3. For 100k points, we should probably use a transferred ArrayBuffer representing the whole density map?
// Let's stick to drawing simple 1x1 rects for "fast" visual feedback, but limit draw calls per frame.

function fastDraw(points) {
    // Determine logic based on quantity
    if (points.length / 3 > 10000) {
        // Too many for fillRect, maybe skip drawing all?
        // Or draw a subset.
        // Let's draw random 5000 points from the batch for visualization to keep UI responsive
        // while calculating math on all.
        
        const step = Math.floor(points.length / 3 / 5000);
        for (let i = 0; i < points.length; i += 3 * step) {
            drawDot(points[i], points[i+1], points[i+2]);
        }
    } else {
        for (let i = 0; i < points.length; i += 3) {
            drawDot(points[i], points[i+1], points[i+2]);
        }
    }
}

function drawDot(x, y, inside) {
    const cx = (x + 1) / 2 * (radius * 2) + (centerX - radius);
    const cy = (y + 1) / 2 * (radius * 2) + (centerY - radius);
    
    ctx.fillStyle = inside ? '#4db6ac' : '#ef5350';
    ctx.fillRect(cx, cy, 1, 1);
}

startBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const batchSize = parseInt(batchSizeSelect.value);
    const speed = parseInt(document.querySelector('input[name="speed"]:checked').value);

    startBtn.disabled = true;
    stopBtn.disabled = false;
    isRunning = true;
    
    clearCanvas();
    totalPointsEl.textContent = '0';
    insidePointsEl.textContent = '0';
    piEstimateEl.textContent = '-';
    piErrorEl.textContent = '-';

    worker.postMessage({
        command: 'start',
        batchSize,
        delay: speed
    });
});

stopBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        worker = null;
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
});

// Override listener for draw
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;
        if (type === 'update') {
            totalPointsEl.textContent = data.total.toLocaleString();
            insidePointsEl.textContent = data.inside.toLocaleString();
            piEstimateEl.textContent = data.estimate.toFixed(7);
            const error = Math.abs((data.estimate - Math.PI) / Math.PI) * 100;
            piErrorEl.textContent = error.toFixed(4);
            
            fastDraw(data.points);
        }
    };
}

clearCanvas();
initWorker();
