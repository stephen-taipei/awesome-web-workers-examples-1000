const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const distanceInput = document.getElementById('distance');
const distanceValue = document.getElementById('distanceValue');
const angleInput = document.getElementById('angle');
const angleValue = document.getElementById('angleValue');
const processBtn = document.getElementById('processBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const worker = new Worker('worker.js');
let originalImage = null;

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
distanceInput.addEventListener('input', () => distanceValue.textContent = distanceInput.value);
angleInput.addEventListener('input', () => angleValue.textContent = angleInput.value);
processBtn.addEventListener('click', processImage);

worker.onmessage = (e) => {
    if (e.data.type === 'result') {
        resultCtx.putImageData(e.data.imageData, 0, 0);
        processBtn.disabled = false;
    }
};

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            let w = img.width, h = img.height;
            if (w > 500) { h = h * 500 / w; w = 500; }
            originalCanvas.width = resultCanvas.width = w;
            originalCanvas.height = resultCanvas.height = h;
            originalCtx.drawImage(img, 0, 0, w, h);
            processBtn.disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processImage() {
    processBtn.disabled = true;
    const w = originalCanvas.width, h = originalCanvas.height;
    const imageData = originalCtx.getImageData(0, 0, w, h);
    worker.postMessage({
        imageData,
        distance: parseInt(distanceInput.value),
        angle: parseInt(angleInput.value)
    });
}
