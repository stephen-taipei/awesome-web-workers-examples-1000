const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const worker = new Worker('worker.js');
let originalImage = null;
let selectedGradient = 'sunset';

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
processBtn.addEventListener('click', processImage);

document.querySelectorAll('.gradient-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.gradient-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedGradient = btn.dataset.gradient;
        if (originalImage) processImage();
    });
});

worker.onmessage = (e) => {
    resultCtx.putImageData(e.data.imageData, 0, 0);
};

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            let w = img.width, h = img.height;
            if (w > 600) { h = h * 600 / w; w = 600; }
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
    const w = originalCanvas.width, h = originalCanvas.height;
    const imageData = originalCtx.getImageData(0, 0, w, h);
    worker.postMessage({ imageData, gradient: selectedGradient });
}
