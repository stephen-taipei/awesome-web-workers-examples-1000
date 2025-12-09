const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const processBtn = document.getElementById('processBtn');
const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const processTimeDisplay = document.getElementById('processTime');
const originalSizeDisplay = document.getElementById('originalSize');
const resultSizeDisplay = document.getElementById('resultSize');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const angleInput = document.getElementById('angle');
const angleVal = document.getElementById('angleVal');
const interpolationSelect = document.getElementById('interpolation');

let worker;
let originalCtx = originalCanvas.getContext('2d');
let resultCtx = resultCanvas.getContext('2d');
let currentImageBitmap = null;

angleInput.addEventListener('input', () => {
    angleVal.textContent = angleInput.value + '°';
});

// Initialize worker
function initWorker() {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, imageData, duration, progress } = e.data;

        if (type === 'progress') {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `處理中... ${Math.round(progress)}%`;
        } else if (type === 'complete') {
            progressBar.style.width = '100%';
            resultCanvas.width = imageData.width;
            resultCanvas.height = imageData.height;
            resultCtx.putImageData(imageData, 0, 0);

            processTimeDisplay.textContent = `${duration}ms`;
            resultSizeDisplay.textContent = `${imageData.width} x ${imageData.height}`;

            setTimeout(() => progressSection.classList.add('hidden'), 500);
            processBtn.disabled = false;
        }
    };
}

initWorker();

// File handling
fileInput.addEventListener('change', handleFileSelect);
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleFileSelect(e) {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
}

function handleFile(file) {
    createImageBitmap(file).then(bitmap => {
        currentImageBitmap = bitmap;
        originalCanvas.width = bitmap.width;
        originalCanvas.height = bitmap.height;
        originalCtx.drawImage(bitmap, 0, 0);

        originalSizeDisplay.textContent = `${bitmap.width} x ${bitmap.height}`;
        processBtn.disabled = false;

        // Clear previous result
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    });
}

// Processing
processBtn.addEventListener('click', () => {
    if (!currentImageBitmap) return;

    const width = originalCanvas.width;
    const height = originalCanvas.height;
    const imageData = originalCtx.getImageData(0, 0, width, height);
    const angle = parseFloat(angleInput.value);
    const interpolation = interpolationSelect.value;

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    processBtn.disabled = true;

    worker.postMessage({
        imageData: imageData,
        angle: angle,
        interpolation: interpolation
    });
});
