const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const numInput = document.getElementById('num');
const numValue = document.getElementById('numValue');
const processBtn = document.getElementById('processBtn');
const previewCanvas = document.getElementById('previewCanvas');
const palette = document.getElementById('palette');
const ctx = previewCanvas.getContext('2d');
const worker = new Worker('worker.js');

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
numInput.addEventListener('input', () => numValue.textContent = numInput.value);
processBtn.addEventListener('click', processImage);
worker.onmessage = (e) => {
    palette.innerHTML = e.data.colors.map(c =>
        `<div class="palette-color" style="background:rgb(${c[0]},${c[1]},${c[2]})" title="rgb(${c[0]},${c[1]},${c[2]})"></div>`
    ).join('');
    processBtn.disabled = false;
};

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > 400) { h = h * 400 / w; w = 400; }
            previewCanvas.width = w;
            previewCanvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            processBtn.disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processImage() {
    processBtn.disabled = true;
    const w = previewCanvas.width, h = previewCanvas.height;
    worker.postMessage({ imageData: ctx.getImageData(0, 0, w, h), numColors: parseInt(numInput.value) });
}
