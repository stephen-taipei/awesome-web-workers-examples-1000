// Image Skew - Main Thread

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

const skewXRange = document.getElementById('skewXRange');
const skewXValue = document.getElementById('skewXValue');
const skewYRange = document.getElementById('skewYRange');
const skewYValue = document.getElementById('skewYValue');

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
const newDimensionsEl = document.getElementById('newDimensions');
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
            const maxSize = 1000; // Smaller for skew as output grows
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

    const skewX = parseFloat(skewXRange.value);
    const skewY = parseFloat(skewYRange.value);

    worker.postMessage({
        type: 'process',
        imageData: originalImageData,
        params: {
            skewX,
            skewY
        }
    });
}

function handleResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    const { processedData, width, height, executionTime } = data;

    if (processedCanvas.width !== width || processedCanvas.height !== height) {
        processedCanvas.width = width;
        processedCanvas.height = height;
    }

    const imageData = new ImageData(
        new Uint8ClampedArray(processedData),
        width,
        height
    );
    processedCtx.putImageData(imageData, 0, 0);

    processedInfo.textContent = `${width} × ${height} - Processed in ${executionTime.toFixed(2)}ms`;

    processingTimeEl.textContent = `${executionTime.toFixed(2)} ms`;
    newDimensionsEl.textContent = `${width} × ${height}`;
    workerStatusEl.textContent = 'Complete';
}

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'skewed-image.png';
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

    skewXRange.value = 0;
    skewXValue.textContent = '0';
    skewYRange.value = 0;
    skewYValue.textContent = '0';
}

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleImageLoad(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleImageLoad(e.target.files[0]);
});

skewXRange.addEventListener('input', () => skewXValue.textContent = skewXRange.value);
skewYRange.addEventListener('input', () => skewYValue.textContent = skewYRange.value);

processBtn.addEventListener('click', processImage);
resetBtn.addEventListener('click', reset);
downloadBtn.addEventListener('click', downloadImage);

reset();
initWorker();
