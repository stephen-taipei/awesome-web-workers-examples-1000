const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const clearBtn = document.getElementById('clearBtn');
const brushSlider = document.getElementById('brush');
const brushValue = document.getElementById('brushValue');
const maskCanvas = document.getElementById('maskCanvas');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const maskCtx = maskCanvas.getContext('2d');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const worker = new Worker('worker.js');

let isDrawing = false;
let maskData = null;

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
brushSlider.addEventListener('input', (e) => brushValue.textContent = e.target.value);
processBtn.addEventListener('click', processImage);
clearBtn.addEventListener('click', clearMask);

maskCanvas.addEventListener('mousedown', (e) => { isDrawing = true; draw(e); });
maskCanvas.addEventListener('mousemove', (e) => { if (isDrawing) draw(e); });
maskCanvas.addEventListener('mouseup', () => isDrawing = false);
maskCanvas.addEventListener('mouseleave', () => isDrawing = false);

worker.onmessage = (e) => { resultCtx.putImageData(e.data.imageData, 0, 0); processBtn.disabled = false; };

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > 400) { h = h * 400 / w; w = 400; }
            maskCanvas.width = originalCanvas.width = resultCanvas.width = w;
            maskCanvas.height = originalCanvas.height = resultCanvas.height = h;
            originalCtx.drawImage(img, 0, 0, w, h);
            maskCtx.drawImage(img, 0, 0, w, h);
            maskData = new Uint8Array(w * h);
            processBtn.disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function draw(e) {
    const rect = maskCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const r = parseInt(brushSlider.value);

    maskCtx.fillStyle = 'rgba(0, 255, 0, 0.5)';
    maskCtx.beginPath();
    maskCtx.arc(x, y, r, 0, Math.PI * 2);
    maskCtx.fill();

    const w = maskCanvas.width;
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy <= r * r) {
                const px = Math.round(x + dx);
                const py = Math.round(y + dy);
                if (px >= 0 && px < w && py >= 0 && py < maskCanvas.height) {
                    maskData[py * w + px] = 1;
                }
            }
        }
    }
}

function clearMask() {
    const w = maskCanvas.width, h = maskCanvas.height;
    maskCtx.putImageData(originalCtx.getImageData(0, 0, w, h), 0, 0);
    maskData = new Uint8Array(w * h);
}

function processImage() {
    processBtn.disabled = true;
    const w = originalCanvas.width, h = originalCanvas.height;
    worker.postMessage({ imageData: originalCtx.getImageData(0, 0, w, h), mask: maskData });
}
