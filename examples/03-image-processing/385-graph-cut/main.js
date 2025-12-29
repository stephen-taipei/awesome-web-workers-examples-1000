const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const fgBtn = document.getElementById('fgBtn');
const bgBtn = document.getElementById('bgBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const worker = new Worker('worker.js');

let originalImageData = null;
let markMode = 'fg'; // 'fg' or 'bg'
let isDrawing = false;
let fgMarks = [];
let bgMarks = [];

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
processBtn.addEventListener('click', processImage);
fgBtn.addEventListener('click', () => { markMode = 'fg'; fgBtn.style.opacity = 1; bgBtn.style.opacity = 0.5; });
bgBtn.addEventListener('click', () => { markMode = 'bg'; bgBtn.style.opacity = 1; fgBtn.style.opacity = 0.5; });

originalCanvas.addEventListener('mousedown', (e) => { isDrawing = true; draw(e); });
originalCanvas.addEventListener('mousemove', (e) => { if (isDrawing) draw(e); });
originalCanvas.addEventListener('mouseup', () => isDrawing = false);
originalCanvas.addEventListener('mouseleave', () => isDrawing = false);

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
            fgMarks = [];
            bgMarks = [];
            processBtn.disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function draw(e) {
    const rect = originalCanvas.getBoundingClientRect();
    const scaleX = originalCanvas.width / rect.width;
    const scaleY = originalCanvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (markMode === 'fg') {
        fgMarks.push({ x, y });
        originalCtx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    } else {
        bgMarks.push({ x, y });
        originalCtx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    }

    originalCtx.beginPath();
    originalCtx.arc(x, y, 3, 0, Math.PI * 2);
    originalCtx.fill();
}

function processImage() {
    processBtn.disabled = true;
    const w = originalCanvas.width, h = originalCanvas.height;
    worker.postMessage({
        imageData: originalImageData,
        fgMarks,
        bgMarks
    });
}
