const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const processBtn = document.getElementById('processBtn');
const sourceCanvas = document.getElementById('sourceCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const processTimeDisplay = document.getElementById('processTime');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const numSuperpixelsInput = document.getElementById('numSuperpixels');
const compactnessInput = document.getElementById('compactness');

let worker;
let originalImageData = null;

// Initialize Worker
function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, executionTime, progress, message } = e.data;

        if (type === 'progress') {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = message;
        } else if (type === 'result') {
            processTimeDisplay.textContent = `${executionTime}ms`;

            drawResult(data.labels, data.width, data.height);

            progressSection.classList.add('hidden');
            processBtn.disabled = false;
        } else if (type === 'error') {
            console.error(data);
            progressText.textContent = `錯誤: ${data}`;
            processBtn.disabled = false;
        }
    };
}

function drawResult(labels, width, height) {
    const resultImg = resultCtx.createImageData(width, height);
    const src = originalImageData.data;
    const dest = resultImg.data;

    // Create boundaries
    // If a pixel label is different from its neighbor (right or down), it's a boundary
    const isBoundary = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const l = labels[i];

            if (x < width - 1 && labels[i + 1] !== l) isBoundary[i] = 1;
            if (y < height - 1 && labels[i + width] !== l) isBoundary[i] = 1;
        }
    }

    for (let i = 0; i < width * height; i++) {
        if (isBoundary[i]) {
            // Draw red boundary
            dest[i*4] = 255;
            dest[i*4+1] = 0;
            dest[i*4+2] = 0;
            dest[i*4+3] = 255;
        } else {
            // Draw original pixel
            // Optionally: Draw average color of superpixel
            dest[i*4] = src[i*4];
            dest[i*4+1] = src[i*4+1];
            dest[i*4+2] = src[i*4+2];
            dest[i*4+3] = 255;
        }
    }

    resultCtx.putImageData(resultImg, 0, 0);
}

// File Handling
function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    const img = new Image();
    img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxSize = 800;

        if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        sourceCanvas.width = width;
        sourceCanvas.height = height;
        resultCanvas.width = width;
        resultCanvas.height = height;

        sourceCtx.drawImage(img, 0, 0, width, height);
        originalImageData = sourceCtx.getImageData(0, 0, width, height);
        resultCtx.drawImage(img, 0, 0, width, height);

        processBtn.disabled = false;
        processTimeDisplay.textContent = '-';
    };
    img.src = URL.createObjectURL(file);
}

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

processBtn.addEventListener('click', () => {
    if (!originalImageData) return;

    initWorker();

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '初始化...';
    processBtn.disabled = true;

    worker.postMessage({
        imageData: originalImageData,
        numSuperpixels: parseInt(numSuperpixelsInput.value),
        compactness: parseInt(compactnessInput.value)
    });
});

initWorker();
