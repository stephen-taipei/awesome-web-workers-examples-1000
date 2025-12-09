// Lens Distortion Correction - Main Thread

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

const k1Range = document.getElementById('k1Range');
const k1Value = document.getElementById('k1Value');
const k2Range = document.getElementById('k2Range');
const k2Value = document.getElementById('k2Value');
const scaleRange = document.getElementById('scaleRange');
const scaleValue = document.getElementById('scaleValue');

const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const originalCanvas = document.getElementById('originalCanvas');
const processedCanvas = document.getElementById('processedCanvas');
const originalCtx = originalCanvas.getContext('2d');
const processedCtx = processedCanvas.getContext('2d');

const originalInfo = document.getElementById('originalInfo');
const processedInfo = document.getElementById('processedInfo');

const resultContainer = document.getElementById('resultContainer');
const processingTimeEl = document.getElementById('processingTime');
const pixelsProcessedEl = document.getElementById('pixelsProcessed');
const workerStatusEl = document.getElementById('workerStatus');

let originalImageData = null;
let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === 'progress') {
            progressBar.style.width = `${data.percent}%`;
            progressText.textContent = `Processing: ${data.percent}%`;
        } else if (type === 'result') {
            handleResult(data);
        } else if (type === 'error') {
            console.error('Worker error:', data.error);
            workerStatusEl.textContent = 'Error';
            progressText.textContent = 'Error occurred';
        }
    };

    workerStatusEl.textContent = 'Ready';
}

function handleImageLoad(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const maxSize = 1920;
            let width = img.width;
            let height = img.height;

            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            originalCanvas.width = width;
            originalCanvas.height = height;
            processedCanvas.width = width;
            processedCanvas.height = height;

            originalCtx.drawImage(img, 0, 0, width, height);
            originalImageData = originalCtx.getImageData(0, 0, width, height);

            originalInfo.textContent = `${width} × ${height} (${(width * height).toLocaleString()} pixels)`;
            processedInfo.textContent = 'Ready to process';

            processBtn.disabled = false;

            processedCtx.fillStyle = '#1a1a1a';
            processedCtx.fillRect(0, 0, width, height);
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

function processImage() {
    if (!originalImageData) return;

    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    workerStatusEl.textContent = 'Processing...';

    initWorker();

    const k1 = parseFloat(k1Range.value);
    const k2 = parseFloat(k2Range.value);
    const scale = parseFloat(scaleRange.value);

    worker.postMessage({
        type: 'process',
        imageData: originalImageData,
        params: {
            k1,
            k2,
            scale
        }
    });
}

function handleResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    const { processedData, executionTime } = data;

    const imageData = new ImageData(
        new Uint8ClampedArray(processedData),
        originalCanvas.width,
        originalCanvas.height
    );
    processedCtx.putImageData(imageData, 0, 0);

    processedInfo.textContent = `Processed in ${executionTime.toFixed(2)}ms`;

    const pixels = originalCanvas.width * originalCanvas.height;
    processingTimeEl.textContent = `${executionTime.toFixed(2)} ms`;
    pixelsProcessedEl.textContent = pixels.toLocaleString();
    workerStatusEl.textContent = 'Complete';
}

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'corrected-image.png';
    link.href = processedCanvas.toDataURL('image/png');
    link.click();
}

function reset() {
    if (worker) {
        worker.terminate();
        worker = null;
    }

    originalImageData = null;
    processBtn.disabled = true;

    originalCanvas.width = 300;
    originalCanvas.height = 200;
    processedCanvas.width = 300;
    processedCanvas.height = 200;

    originalCtx.fillStyle = '#1a1a1a';
    originalCtx.fillRect(0, 0, 300, 200);
    originalCtx.fillStyle = '#4a7a5a';
    originalCtx.font = '14px sans-serif';
    originalCtx.textAlign = 'center';
    originalCtx.fillText('Upload an image', 150, 100);

    processedCtx.fillStyle = '#1a1a1a';
    processedCtx.fillRect(0, 0, 300, 200);

    originalInfo.textContent = 'No image loaded';
    processedInfo.textContent = '-';

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');

    k1Range.value = 0.0;
    k1Value.textContent = '0.0';
    k2Range.value = 0.0;
    k2Value.textContent = '0.0';
    scaleRange.value = 1.0;
    scaleValue.textContent = '1.0';
}

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        handleImageLoad(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleImageLoad(e.target.files[0]);
    }
});

k1Range.addEventListener('input', () => {
    k1Value.textContent = k1Range.value;
});

k2Range.addEventListener('input', () => {
    k2Value.textContent = k2Range.value;
});

scaleRange.addEventListener('input', () => {
    scaleValue.textContent = scaleRange.value;
});

processBtn.addEventListener('click', processImage);
resetBtn.addEventListener('click', reset);
downloadBtn.addEventListener('click', downloadImage);

reset();
initWorker();
