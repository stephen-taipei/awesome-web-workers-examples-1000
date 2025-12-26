const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const widthSlider = document.getElementById('targetWidth');
const edgeSlider = document.getElementById('edgeWeight');
const widthValue = document.getElementById('widthValue');
const edgeValue = document.getElementById('edgeValue');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const worker = new Worker('worker.js');

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
widthSlider.addEventListener('input', (e) => widthValue.textContent = e.target.value);
edgeSlider.addEventListener('input', (e) => edgeValue.textContent = e.target.value);
processBtn.addEventListener('click', processImage);
worker.onmessage = (e) => {
    const { imageData, newWidth, newHeight } = e.data;
    resultCanvas.width = newWidth;
    resultCanvas.height = newHeight;
    resultCtx.putImageData(imageData, 0, 0);
    processBtn.disabled = false;
};

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > 250) { h = h * 250 / w; w = 250; }
            originalCanvas.width = w;
            originalCanvas.height = h;
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
    worker.postMessage({
        imageData: originalCtx.getImageData(0, 0, w, h),
        targetWidthPercent: parseInt(widthSlider.value),
        edgeWeight: parseInt(edgeSlider.value) / 100
    });
}
