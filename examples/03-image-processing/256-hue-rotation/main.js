// Hue Rotation - Main Thread

const imageInput = document.getElementById('imageInput');
const hueSlider = document.getElementById('hueSlider');
const hueValue = document.getElementById('hueValue');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const imageSizeEl = document.getElementById('imageSize');
const pixelCountEl = document.getElementById('pixelCount');
const processingTimeEl = document.getElementById('processingTime');
const hueShiftEl = document.getElementById('hueShift');

const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');

let worker = null;
let originalImageData = null;
let currentImage = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
}

function handleWorkerMessage(e) {
    const data = e.data;

    if (data.type === 'progress') {
        updateProgress(data);
    } else if (data.type === 'result') {
        showResult(data);
    }
}

function updateProgress(data) {
    progressContainer.classList.remove('hidden');
    progressBar.style.width = data.percent + '%';
    progressText.textContent = `Processing... ${data.percent}% (${data.processedPixels.toLocaleString()} pixels)`;
}

function showResult(data) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    // Draw result to canvas
    const imageData = new ImageData(
        new Uint8ClampedArray(data.imageData),
        data.width,
        data.height
    );
    resultCtx.putImageData(imageData, 0, 0);

    // Update stats
    imageSizeEl.textContent = `${data.width} × ${data.height}`;
    pixelCountEl.textContent = (data.width * data.height).toLocaleString();
    processingTimeEl.textContent = `${data.executionTime.toFixed(2)} ms`;
    hueShiftEl.textContent = `${data.hueRotation}°`;

    downloadBtn.disabled = false;
    processBtn.disabled = false;
}

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            currentImage = img;

            // Set canvas sizes
            const maxSize = 800;
            let width = img.width;
            let height = img.height;

            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }

            originalCanvas.width = width;
            originalCanvas.height = height;
            resultCanvas.width = width;
            resultCanvas.height = height;

            // Draw original image
            originalCtx.drawImage(img, 0, 0, width, height);
            originalImageData = originalCtx.getImageData(0, 0, width, height);

            // Clear result canvas
            resultCtx.fillStyle = '#1a1a2e';
            resultCtx.fillRect(0, 0, width, height);
            resultCtx.fillStyle = '#6ee7b7';
            resultCtx.font = '14px sans-serif';
            resultCtx.textAlign = 'center';
            resultCtx.fillText('Click "Apply Hue Rotation" to process', width / 2, height / 2);

            processBtn.disabled = false;
            downloadBtn.disabled = true;
            resultContainer.classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processImage() {
    if (!originalImageData) return;

    const hueRotation = parseInt(hueSlider.value);

    processBtn.disabled = true;
    downloadBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    initWorker();
    worker.postMessage({
        imageData: originalImageData.data.buffer,
        width: originalImageData.width,
        height: originalImageData.height,
        hueRotation: hueRotation
    }, [originalImageData.data.buffer.slice(0)]);
}

function reset() {
    if (worker) {
        worker.terminate();
        worker = null;
    }

    hueSlider.value = 0;
    hueValue.textContent = '0';

    if (currentImage && originalImageData) {
        // Redraw original
        originalCtx.drawImage(currentImage, 0, 0, originalCanvas.width, originalCanvas.height);
        originalImageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

        resultCtx.fillStyle = '#1a1a2e';
        resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
        resultCtx.fillStyle = '#6ee7b7';
        resultCtx.font = '14px sans-serif';
        resultCtx.textAlign = 'center';
        resultCtx.fillText('Click "Apply Hue Rotation" to process', resultCanvas.width / 2, resultCanvas.height / 2);
    }

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    downloadBtn.disabled = true;
}

function downloadResult() {
    const link = document.createElement('a');
    link.download = `hue-rotated-${hueSlider.value}deg.png`;
    link.href = resultCanvas.toDataURL('image/png');
    link.click();
}

// Event listeners
imageInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
        loadImage(e.target.files[0]);
    }
});

hueSlider.addEventListener('input', function() {
    hueValue.textContent = this.value;
});

processBtn.addEventListener('click', processImage);
resetBtn.addEventListener('click', reset);
downloadBtn.addEventListener('click', downloadResult);

// Initialize with placeholder
function initPlaceholder() {
    const placeholderSize = 400;
    originalCanvas.width = placeholderSize;
    originalCanvas.height = placeholderSize;
    resultCanvas.width = placeholderSize;
    resultCanvas.height = placeholderSize;

    [originalCtx, resultCtx].forEach(ctx => {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, placeholderSize, placeholderSize);
        ctx.fillStyle = '#6ee7b7';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Upload an image to begin', placeholderSize / 2, placeholderSize / 2);
    });
}

initPlaceholder();
