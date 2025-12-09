// Image Cropping - Main Thread

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const cropBtn = document.getElementById('cropBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');

const cropCanvas = document.getElementById('cropCanvas');
const cropCtx = cropCanvas.getContext('2d');
const resultCanvas = document.getElementById('resultCanvas');
const resultCtx = resultCanvas.getContext('2d');

const selectionInfo = document.getElementById('selectionInfo');
const originalInfo = document.getElementById('originalInfo');
const resultInfo = document.getElementById('resultInfo');
const resultContainer = document.getElementById('resultContainer');
const processingTimeEl = document.getElementById('processingTime');
const originalSizeEl = document.getElementById('originalSize');
const croppedSizeEl = document.getElementById('croppedSize');

let originalImage = null;
let originalImageData = null;
let worker = null;
let isDragging = false;
let startX, startY, currentX, currentY;
let selection = null; // {x, y, w, h} normalized to canvas coordinates
let scale = 1;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = (e) => {
        const { type, data } = e.data;
        if (type === 'result') {
            handleResult(data);
        } else if (type === 'error') {
            console.error(data.message);
        }
    };
}

function handleImageLoad(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;

            // Limit canvas display size but keep full resolution data
            const maxDisplayWidth = 800;
            scale = Math.min(1, maxDisplayWidth / img.width);

            cropCanvas.width = img.width;
            cropCanvas.height = img.height;
            cropCanvas.style.width = `${img.width * scale}px`;

            cropCtx.drawImage(img, 0, 0);
            originalImageData = cropCtx.getImageData(0, 0, img.width, img.height);

            originalInfo.textContent = `${img.width} × ${img.height}`;
            originalSizeEl.textContent = `${img.width} × ${img.height}`;

            resetSelection();
            cropBtn.disabled = true;
            resultContainer.classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function resetSelection() {
    selection = null;
    isDragging = false;
    selectionInfo.textContent = "No selection";
    redrawCanvas();
}

function redrawCanvas() {
    if (!originalImage) return;
    cropCtx.drawImage(originalImage, 0, 0);

    if (selection) {
        cropCtx.fillStyle = 'rgba(16, 185, 129, 0.3)';
        cropCtx.fillRect(selection.x, selection.y, selection.w, selection.h);

        cropCtx.strokeStyle = '#10b981';
        cropCtx.lineWidth = 2;
        cropCtx.strokeRect(selection.x, selection.y, selection.w, selection.h);
    }
}

function getCanvasCoordinates(e) {
    const rect = cropCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (cropCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (cropCanvas.height / rect.height);
    return { x, y };
}

cropCanvas.addEventListener('mousedown', (e) => {
    if (!originalImage) return;
    isDragging = true;
    const coords = getCanvasCoordinates(e);
    startX = coords.x;
    startY = coords.y;
    selection = { x: startX, y: startY, w: 0, h: 0 };
    redrawCanvas();
});

cropCanvas.addEventListener('mousemove', (e) => {
    if (!isDragging || !originalImage) return;
    const coords = getCanvasCoordinates(e);
    currentX = coords.x;
    currentY = coords.y;

    let w = currentX - startX;
    let h = currentY - startY;

    selection = {
        x: w > 0 ? startX : currentX,
        y: h > 0 ? startY : currentY,
        w: Math.abs(w),
        h: Math.abs(h)
    };

    // Constrain to image bounds
    selection.x = Math.max(0, selection.x);
    selection.y = Math.max(0, selection.y);
    if (selection.x + selection.w > cropCanvas.width) selection.w = cropCanvas.width - selection.x;
    if (selection.y + selection.h > cropCanvas.height) selection.h = cropCanvas.height - selection.y;

    selectionInfo.textContent = `Selection: ${Math.round(selection.w)} × ${Math.round(selection.h)} at (${Math.round(selection.x)}, ${Math.round(selection.y)})`;
    cropBtn.disabled = selection.w === 0 || selection.h === 0;

    redrawCanvas();
});

cropCanvas.addEventListener('mouseup', () => {
    isDragging = false;
});

cropCanvas.addEventListener('mouseleave', () => {
    isDragging = false;
});

cropBtn.addEventListener('click', () => {
    if (!selection || !worker) return;

    worker.postMessage({
        type: 'crop',
        imageData: originalImageData,
        x: Math.round(selection.x),
        y: Math.round(selection.y),
        width: Math.round(selection.w),
        height: Math.round(selection.h)
    });
});

function handleResult(data) {
    const { croppedImageData, executionTime, width, height } = data;

    resultCanvas.width = width;
    resultCanvas.height = height;

    const imageData = new ImageData(
        new Uint8ClampedArray(croppedImageData),
        width,
        height
    );

    resultCtx.putImageData(imageData, 0, 0);

    processingTimeEl.textContent = `${executionTime.toFixed(2)} ms`;
    croppedSizeEl.textContent = `${width} × ${height}`;
    resultInfo.textContent = `${width} × ${height}`;

    resultContainer.classList.remove('hidden');
}

resetBtn.addEventListener('click', () => {
    resetSelection();
    resultContainer.classList.add('hidden');
    resultCanvas.width = 0;
    resultCanvas.height = 0;
    resultInfo.textContent = "-";
    cropBtn.disabled = true;
});

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'cropped-image.png';
    link.href = resultCanvas.toDataURL();
    link.click();
});

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

initWorker();
