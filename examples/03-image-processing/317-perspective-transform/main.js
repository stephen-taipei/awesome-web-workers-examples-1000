// Perspective Transform - Main Thread

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const transformBtn = document.getElementById('transformBtn');
const resetBtn = document.getElementById('resetBtn');
const processingTimeEl = document.getElementById('processingTime');

const sourceCanvas = document.getElementById('sourceCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const resultCanvas = document.getElementById('resultCanvas');
const resultCtx = resultCanvas.getContext('2d');
const container = document.getElementById('transformContainer');

const handles = {
    tl: document.getElementById('tl'),
    tr: document.getElementById('tr'),
    br: document.getElementById('br'),
    bl: document.getElementById('bl')
};

let originalImage = null;
let originalImageData = null;
let worker = null;
let displayScale = 1;
let corners = { tl: {x:0, y:0}, tr: {x:0, y:0}, br: {x:0, y:0}, bl: {x:0, y:0} };

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        if (e.data.type === 'result') {
            const { imageData, width, height, executionTime } = e.data;
            resultCanvas.width = width;
            resultCanvas.height = height;
            resultCtx.putImageData(new ImageData(new Uint8ClampedArray(imageData), width, height), 0, 0);
            processingTimeEl.textContent = `Processing Time: ${executionTime.toFixed(2)}ms`;
            transformBtn.disabled = false;
        }
    };
}

function updateHandles() {
    // Update DOM element positions based on normalized corners * display dimensions
    const rect = sourceCanvas.getBoundingClientRect(); // get displayed size
    // Wait, better to use the canvas style width/height if set, or just use scale relative to intrinsic size.
    // The canvas is styled with max-width: 100%.
    // Let's use internal coords for 'corners' and map to display.

    // Corners are stored in image coordinates (0 to img.width, 0 to img.height)

    // Position handles relative to container
    // sourceCanvas is in container.

    // Need current display size of canvas
    const displayWidth = sourceCanvas.offsetWidth;
    const displayHeight = sourceCanvas.offsetHeight;

    // Scale factor from image coord to display coord
    const scaleX = displayWidth / sourceCanvas.width;
    const scaleY = displayHeight / sourceCanvas.height;

    setHandlePos(handles.tl, corners.tl, scaleX, scaleY);
    setHandlePos(handles.tr, corners.tr, scaleX, scaleY);
    setHandlePos(handles.br, corners.br, scaleX, scaleY);
    setHandlePos(handles.bl, corners.bl, scaleX, scaleY);

    drawGrid();
}

function setHandlePos(el, pos, sx, sy) {
    el.style.left = (pos.x * sx) + 'px';
    el.style.top = (pos.y * sy) + 'px';
}

function drawGrid() {
    // Ideally draw a grid connecting the points on the canvas overlay?
    // For simplicity, let's redraw source image + lines connecting corners
    sourceCtx.drawImage(originalImage, 0, 0);

    sourceCtx.beginPath();
    sourceCtx.strokeStyle = '#10b981';
    sourceCtx.lineWidth = 3;
    sourceCtx.moveTo(corners.tl.x, corners.tl.y);
    sourceCtx.lineTo(corners.tr.x, corners.tr.y);
    sourceCtx.lineTo(corners.br.x, corners.br.y);
    sourceCtx.lineTo(corners.bl.x, corners.bl.y);
    sourceCtx.closePath();
    sourceCtx.stroke();
}

function handleImageLoad(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            // Resize for performance in example if needed, but let's keep full res logic
            const maxW = 800;
            const s = Math.min(1, maxW / img.width);

            sourceCanvas.width = img.width;
            sourceCanvas.height = img.height;
            // CSS handles display size

            sourceCtx.drawImage(img, 0, 0);
            originalImageData = sourceCtx.getImageData(0, 0, img.width, img.height);

            // Reset corners to image corners inset slightly
            const w = img.width;
            const h = img.height;
            const pad = Math.min(w, h) * 0.1;

            corners = {
                tl: { x: pad, y: pad },
                tr: { x: w - pad, y: pad },
                br: { x: w - pad, y: h - pad },
                bl: { x: pad, y: h - pad }
            };

            transformBtn.disabled = false;
            updateHandles();

            // Clear result
            resultCanvas.width = w;
            resultCanvas.height = h;
            resultCtx.clearRect(0, 0, w, h);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Dragging logic
let activeHandle = null;

container.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('handle')) {
        activeHandle = e.target.dataset.corner;
    }
});

window.addEventListener('mousemove', (e) => {
    if (!activeHandle || !originalImage) return;

    const rect = sourceCanvas.getBoundingClientRect();
    const scaleX = sourceCanvas.width / rect.width;
    const scaleY = sourceCanvas.height / rect.height;

    let x = (e.clientX - rect.left) * scaleX;
    let y = (e.clientY - rect.top) * scaleY;

    // Clamp
    x = Math.max(0, Math.min(sourceCanvas.width, x));
    y = Math.max(0, Math.min(sourceCanvas.height, y));

    corners[activeHandle] = { x, y };
    updateHandles();
});

window.addEventListener('mouseup', () => {
    activeHandle = null;
});

transformBtn.addEventListener('click', () => {
    if (!originalImageData) return;
    transformBtn.disabled = true;
    processingTimeEl.textContent = 'Processing...';

    // Target dimensions can be estimated or fixed.
    // Usually we map the quad to a rectangle of bounding box size or max edge length.
    // Let's approximate width/height based on top/bottom and left/right averages
    const widthTop = Math.hypot(corners.tr.x - corners.tl.x, corners.tr.y - corners.tl.y);
    const widthBot = Math.hypot(corners.br.x - corners.bl.x, corners.br.y - corners.bl.y);
    const heightLeft = Math.hypot(corners.bl.x - corners.tl.x, corners.bl.y - corners.tl.y);
    const heightRight = Math.hypot(corners.br.x - corners.tr.x, corners.br.y - corners.tr.y);

    const targetWidth = Math.round(Math.max(widthTop, widthBot));
    const targetHeight = Math.round(Math.max(heightLeft, heightRight));

    worker.postMessage({
        type: 'transform',
        imageData: originalImageData,
        corners: corners,
        targetWidth,
        targetHeight
    });
});

resetBtn.addEventListener('click', () => {
    if (originalImage) {
        // Reload image logic basically
        sourceCtx.drawImage(originalImage, 0, 0);
        const w = sourceCanvas.width;
        const h = sourceCanvas.height;
        const pad = Math.min(w, h) * 0.1;
        corners = {
            tl: { x: pad, y: pad },
            tr: { x: w - pad, y: pad },
            br: { x: w - pad, y: h - pad },
            bl: { x: pad, y: h - pad }
        };
        updateHandles();
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    }
});

// File input handlers
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleImageLoad(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleImageLoad(e.target.files[0]);
});

// Window resize handling for handle positions
window.addEventListener('resize', () => {
    if (originalImage) updateHandles();
});

initWorker();
