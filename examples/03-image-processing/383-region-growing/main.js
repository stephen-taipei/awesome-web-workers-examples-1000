const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const toleranceInput = document.getElementById('tolerance');
const toleranceValue = document.getElementById('toleranceValue');
const pixelCount = document.getElementById('pixelCount');
const worker = new Worker('worker.js');

let imageLoaded = false;

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
toleranceInput.addEventListener('input', () => toleranceValue.textContent = toleranceInput.value);

originalCanvas.addEventListener('click', (e) => {
    if (!imageLoaded) return;
    const rect = originalCanvas.getBoundingClientRect();
    const scaleX = originalCanvas.width / rect.width;
    const scaleY = originalCanvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    processImage(x, y);
});

worker.onmessage = (e) => {
    resultCtx.putImageData(e.data.imageData, 0, 0);
    pixelCount.textContent = e.data.count;
};

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > 500) { h = h * 500 / w; w = 500; }
            originalCanvas.width = resultCanvas.width = w;
            originalCanvas.height = resultCanvas.height = h;
            originalCtx.drawImage(img, 0, 0, w, h);
            imageLoaded = true;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processImage(seedX, seedY) {
    const w = originalCanvas.width, h = originalCanvas.height;
    worker.postMessage({
        imageData: originalCtx.getImageData(0, 0, w, h),
        seedX,
        seedY,
        tolerance: parseInt(toleranceInput.value)
    });
}
