// Sepia Filter - Main Thread

const imageInput = document.getElementById('imageInput');
const intensityInput = document.getElementById('intensity');
const intensityValue = document.getElementById('intensityValue');
const applyBtn = document.getElementById('applyBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const imageSizeEl = document.getElementById('imageSize');
const totalPixelsEl = document.getElementById('totalPixels');
const processingTimeEl = document.getElementById('processingTime');
const throughputEl = document.getElementById('throughput');

const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');

let worker = null;
let originalImageData = null;

// Update intensity display
intensityInput.addEventListener('input', function() {
    intensityValue.textContent = this.value + '%';
});

// Handle image selection
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = function() {
        // Limit size for performance
        const maxSize = 1920;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
            if (width > height) {
                height = Math.round((height * maxSize) / width);
                width = maxSize;
            } else {
                width = Math.round((width * maxSize) / height);
                height = maxSize;
            }
        }

        originalCanvas.width = width;
        originalCanvas.height = height;
        resultCanvas.width = width;
        resultCanvas.height = height;

        originalCtx.drawImage(img, 0, 0, width, height);
        originalImageData = originalCtx.getImageData(0, 0, width, height);

        // Clear result canvas
        resultCtx.fillStyle = '#0f0a07';
        resultCtx.fillRect(0, 0, width, height);

        applyBtn.disabled = false;
        downloadBtn.disabled = true;
        resultContainer.classList.add('hidden');
    };

    img.src = URL.createObjectURL(file);
});

// Apply sepia filter
applyBtn.addEventListener('click', function() {
    if (!originalImageData) return;

    applyBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting...';

    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    const startTime = performance.now();

    worker.onmessage = function(e) {
        const data = e.data;

        if (data.type === 'progress') {
            progressBar.style.width = data.percent + '%';
            progressText.textContent = `Processing: ${data.percent}% (${data.processedPixels.toLocaleString()} / ${data.totalPixels.toLocaleString()} pixels)`;
        } else if (data.type === 'result') {
            const endTime = performance.now();
            const processingTime = endTime - startTime;

            // Display result
            const resultImageData = new ImageData(
                new Uint8ClampedArray(data.imageData),
                originalImageData.width,
                originalImageData.height
            );
            resultCtx.putImageData(resultImageData, 0, 0);

            // Show statistics
            progressContainer.classList.add('hidden');
            resultContainer.classList.remove('hidden');

            const width = originalImageData.width;
            const height = originalImageData.height;
            const totalPixels = width * height;

            imageSizeEl.textContent = `${width} x ${height}`;
            totalPixelsEl.textContent = totalPixels.toLocaleString();
            processingTimeEl.textContent = processingTime.toFixed(2) + ' ms';
            throughputEl.textContent = (totalPixels / processingTime * 1000 / 1000000).toFixed(2) + ' MP/s';

            applyBtn.disabled = false;
            downloadBtn.disabled = false;
        }
    };

    // Send image data to worker
    const intensity = parseInt(intensityInput.value) / 100;
    worker.postMessage({
        imageData: originalImageData.data.buffer,
        width: originalImageData.width,
        height: originalImageData.height,
        intensity: intensity
    }, [originalImageData.data.buffer.slice(0)]);
});

// Reset
resetBtn.addEventListener('click', function() {
    if (worker) {
        worker.terminate();
        worker = null;
    }

    imageInput.value = '';
    intensityInput.value = 100;
    intensityValue.textContent = '100%';

    originalCanvas.width = 400;
    originalCanvas.height = 300;
    resultCanvas.width = 400;
    resultCanvas.height = 300;

    originalCtx.fillStyle = '#0f0a07';
    originalCtx.fillRect(0, 0, 400, 300);
    originalCtx.fillStyle = '#4a3a2a';
    originalCtx.font = '14px sans-serif';
    originalCtx.textAlign = 'center';
    originalCtx.fillText('Select an image to process', 200, 150);

    resultCtx.fillStyle = '#0f0a07';
    resultCtx.fillRect(0, 0, 400, 300);
    resultCtx.fillStyle = '#4a3a2a';
    resultCtx.font = '14px sans-serif';
    resultCtx.textAlign = 'center';
    resultCtx.fillText('Result will appear here', 200, 150);

    originalImageData = null;
    applyBtn.disabled = true;
    downloadBtn.disabled = true;
    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
});

// Download result
downloadBtn.addEventListener('click', function() {
    const link = document.createElement('a');
    link.download = 'sepia-filter-result.png';
    link.href = resultCanvas.toDataURL('image/png');
    link.click();
});

// Initialize
resetBtn.click();
