const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const worker = new Worker('worker.js');

let originalImageData = null;
let isDrawing = false;
let startX, startY, endX, endY;

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
processBtn.addEventListener('click', processImage);

originalCanvas.addEventListener('mousedown', (e) => {
    if (!originalImageData) return;
    isDrawing = true;
    const rect = originalCanvas.getBoundingClientRect();
    const scaleX = originalCanvas.width / rect.width;
    const scaleY = originalCanvas.height / rect.height;
    startX = Math.floor((e.clientX - rect.left) * scaleX);
    startY = Math.floor((e.clientY - rect.top) * scaleY);
});

originalCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = originalCanvas.getBoundingClientRect();
    const scaleX = originalCanvas.width / rect.width;
    const scaleY = originalCanvas.height / rect.height;
    endX = Math.floor((e.clientX - rect.left) * scaleX);
    endY = Math.floor((e.clientY - rect.top) * scaleY);
    redrawWithRect();
});

originalCanvas.addEventListener('mouseup', () => {
    isDrawing = false;
    processBtn.disabled = false;
});

worker.onmessage = (e) => {
    resultCtx.putImageData(e.data.imageData, 0, 0);
    processBtn.disabled = false;
};

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > 400) { h = h * 400 / w; w = 400; }
            originalCanvas.width = resultCanvas.width = w;
            originalCanvas.height = resultCanvas.height = h;
            originalCtx.drawImage(img, 0, 0, w, h);
            originalImageData = originalCtx.getImageData(0, 0, w, h);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function redrawWithRect() {
    originalCtx.putImageData(originalImageData, 0, 0);
    originalCtx.strokeStyle = 'lime';
    originalCtx.lineWidth = 2;
    originalCtx.strokeRect(startX, startY, endX - startX, endY - startY);
}

function processImage() {
    processBtn.disabled = true;
    const w = originalCanvas.width, h = originalCanvas.height;
    const rect = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width: Math.abs(endX - startX),
        height: Math.abs(endY - startY)
    };
    worker.postMessage({ imageData: originalImageData, rect });
}
