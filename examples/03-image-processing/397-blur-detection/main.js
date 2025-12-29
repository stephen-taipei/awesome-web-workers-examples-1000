const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const processBtn = document.getElementById('processBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const resultDiv = document.getElementById('result');
const statusEl = document.getElementById('status');
const blurScoreEl = document.getElementById('blurScore');
const worker = new Worker('worker.js');

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => loadImage(e.target.files[0]));
processBtn.addEventListener('click', processImage);

worker.onmessage = (e) => {
    resultCtx.putImageData(e.data.imageData, 0, 0);
    blurScoreEl.textContent = e.data.blurScore.toFixed(2);

    resultDiv.style.display = 'block';
    resultDiv.className = 'result ' + e.data.classification;
    statusEl.textContent = e.data.status;

    processBtn.disabled = false;
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
            processBtn.disabled = false;
            resultDiv.style.display = 'none';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processImage() {
    processBtn.disabled = true;
    const w = originalCanvas.width, h = originalCanvas.height;
    worker.postMessage({
        imageData: originalCtx.getImageData(0, 0, w, h)
    });
}
