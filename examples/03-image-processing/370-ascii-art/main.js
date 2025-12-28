const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const colsInput = document.getElementById('cols');
const colsValue = document.getElementById('colsValue');
const processBtn = document.getElementById('processBtn');
const originalCanvas = document.getElementById('originalCanvas');
const asciiOutput = document.getElementById('asciiOutput');
const originalCtx = originalCanvas.getContext('2d');
const worker = new Worker('worker.js');

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
colsInput.addEventListener('input', () => colsValue.textContent = colsInput.value);
processBtn.addEventListener('click', processImage);
worker.onmessage = (e) => { asciiOutput.textContent = e.data.ascii; processBtn.disabled = false; };

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > 400) { h = h * 400 / w; w = 400; }
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
    worker.postMessage({ imageData: originalCtx.getImageData(0, 0, w, h), cols: parseInt(colsInput.value) });
}
