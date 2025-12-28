const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const focusSlider = document.getElementById('focus');
const dofSlider = document.getElementById('dof');
const blurSlider = document.getElementById('blur');
const focusValue = document.getElementById('focusValue');
const dofValue = document.getElementById('dofValue');
const blurValue = document.getElementById('blurValue');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const worker = new Worker('worker.js');

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
focusSlider.addEventListener('input', (e) => focusValue.textContent = e.target.value);
dofSlider.addEventListener('input', (e) => dofValue.textContent = e.target.value);
blurSlider.addEventListener('input', (e) => blurValue.textContent = e.target.value);
processBtn.addEventListener('click', processImage);
worker.onmessage = (e) => { resultCtx.putImageData(e.data.imageData, 0, 0); processBtn.disabled = false; };

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
        focusPoint: parseInt(focusSlider.value) / 100,
        dofRange: parseInt(dofSlider.value) / 100,
        blurRadius: parseInt(blurSlider.value)
    });
}
