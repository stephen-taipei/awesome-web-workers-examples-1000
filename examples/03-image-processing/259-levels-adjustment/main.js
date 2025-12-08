// Levels Adjustment - Main Thread

const imageInput = document.getElementById('imageInput');
const inputBlackSlider = document.getElementById('inputBlackSlider');
const inputWhiteSlider = document.getElementById('inputWhiteSlider');
const outputBlackSlider = document.getElementById('outputBlackSlider');
const outputWhiteSlider = document.getElementById('outputWhiteSlider');
const gammaSlider = document.getElementById('gammaSlider');

const inputBlackValue = document.getElementById('inputBlackValue');
const inputWhiteValue = document.getElementById('inputWhiteValue');
const outputBlackValue = document.getElementById('outputBlackValue');
const outputWhiteValue = document.getElementById('outputWhiteValue');
const gammaValue = document.getElementById('gammaValue');

const processBtn = document.getElementById('processBtn');
const autoBtn = document.getElementById('autoBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

const resultContainer = document.getElementById('resultContainer');
const imageSizeEl = document.getElementById('imageSize');
const processingTimeEl = document.getElementById('processingTime');
const inputRangeEl = document.getElementById('inputRange');
const outputRangeEl = document.getElementById('outputRange');

const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const histogramCanvas = document.getElementById('histogramCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const histogramCtx = histogramCanvas.getContext('2d');

let worker = null;
let originalImageData = null;
let currentImage = null;
let histogram = null;

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
    } else if (data.type === 'histogram') {
        histogram = data.histogram;
        drawHistogram();
    }
}

function updateProgress(data) {
    progressContainer.classList.remove('hidden');
    progressBar.style.width = data.percent + '%';
    progressText.textContent = `Processing... ${data.percent}%`;
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
    processingTimeEl.textContent = `${data.executionTime.toFixed(2)} ms`;
    inputRangeEl.textContent = `${data.inputBlack} - ${data.inputWhite}`;
    outputRangeEl.textContent = `${data.outputBlack} - ${data.outputWhite}`;

    downloadBtn.disabled = false;
    processBtn.disabled = false;
}

function drawHistogram() {
    if (!histogram) return;

    const w = histogramCanvas.width;
    const h = histogramCanvas.height;

    // Clear
    histogramCtx.fillStyle = '#1a1a2e';
    histogramCtx.fillRect(0, 0, w, h);

    // Find max value for scaling
    const maxVal = Math.max(...histogram.r, ...histogram.g, ...histogram.b);
    if (maxVal === 0) return;

    // Draw RGB histograms
    const colors = [
        { data: histogram.r, color: 'rgba(239, 68, 68, 0.6)' },
        { data: histogram.g, color: 'rgba(34, 197, 94, 0.6)' },
        { data: histogram.b, color: 'rgba(59, 130, 246, 0.6)' }
    ];

    colors.forEach(({ data, color }) => {
        histogramCtx.fillStyle = color;
        histogramCtx.beginPath();
        histogramCtx.moveTo(0, h);

        for (let i = 0; i < 256; i++) {
            const barHeight = (data[i] / maxVal) * h;
            histogramCtx.lineTo(i, h - barHeight);
        }

        histogramCtx.lineTo(255, h);
        histogramCtx.closePath();
        histogramCtx.fill();
    });

    // Draw luminance histogram
    histogramCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    histogramCtx.lineWidth = 1;
    histogramCtx.beginPath();

    for (let i = 0; i < 256; i++) {
        const lum = 0.299 * histogram.r[i] + 0.587 * histogram.g[i] + 0.114 * histogram.b[i];
        const barHeight = (lum / maxVal) * h;
        if (i === 0) {
            histogramCtx.moveTo(i, h - barHeight);
        } else {
            histogramCtx.lineTo(i, h - barHeight);
        }
    }
    histogramCtx.stroke();

    // Draw input range markers
    const inputBlack = parseInt(inputBlackSlider.value);
    const inputWhite = parseInt(inputWhiteSlider.value);

    histogramCtx.strokeStyle = '#f472b6';
    histogramCtx.lineWidth = 2;
    histogramCtx.beginPath();
    histogramCtx.moveTo(inputBlack, 0);
    histogramCtx.lineTo(inputBlack, h);
    histogramCtx.stroke();

    histogramCtx.beginPath();
    histogramCtx.moveTo(inputWhite, 0);
    histogramCtx.lineTo(inputWhite, h);
    histogramCtx.stroke();
}

function calculateHistogram() {
    if (!originalImageData) return;

    initWorker();
    worker.postMessage({
        type: 'histogram',
        imageData: originalImageData.data.buffer,
        width: originalImageData.width,
        height: originalImageData.height
    }, [originalImageData.data.buffer.slice(0)]);
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
            resultCtx.fillStyle = '#22d3ee';
            resultCtx.font = '14px sans-serif';
            resultCtx.textAlign = 'center';
            resultCtx.fillText('Click "Apply Levels" to process', width / 2, height / 2);

            // Calculate histogram
            calculateHistogram();

            processBtn.disabled = false;
            autoBtn.disabled = false;
            downloadBtn.disabled = true;
            resultContainer.classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processImage() {
    if (!originalImageData) return;

    const inputBlack = parseInt(inputBlackSlider.value);
    const inputWhite = parseInt(inputWhiteSlider.value);
    const outputBlack = parseInt(outputBlackSlider.value);
    const outputWhite = parseInt(outputWhiteSlider.value);
    const gamma = parseFloat(gammaSlider.value);

    processBtn.disabled = true;
    downloadBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    // Re-read original image data
    originalCtx.drawImage(currentImage, 0, 0, originalCanvas.width, originalCanvas.height);
    originalImageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

    initWorker();
    worker.postMessage({
        type: 'levels',
        imageData: originalImageData.data.buffer,
        width: originalImageData.width,
        height: originalImageData.height,
        inputBlack,
        inputWhite,
        outputBlack,
        outputWhite,
        gamma
    }, [originalImageData.data.buffer.slice(0)]);
}

function autoLevels() {
    if (!histogram) return;

    // Find actual min/max from histogram
    let minVal = 0;
    let maxVal = 255;

    // Find first non-zero value (with threshold to ignore noise)
    const threshold = histogram.r.reduce((a, b) => a + b, 0) * 0.001;

    for (let i = 0; i < 256; i++) {
        const total = histogram.r[i] + histogram.g[i] + histogram.b[i];
        if (total > threshold) {
            minVal = i;
            break;
        }
    }

    for (let i = 255; i >= 0; i--) {
        const total = histogram.r[i] + histogram.g[i] + histogram.b[i];
        if (total > threshold) {
            maxVal = i;
            break;
        }
    }

    inputBlackSlider.value = minVal;
    inputWhiteSlider.value = maxVal;
    inputBlackValue.textContent = minVal;
    inputWhiteValue.textContent = maxVal;

    drawHistogram();
}

function reset() {
    if (worker) {
        worker.terminate();
        worker = null;
    }

    inputBlackSlider.value = 0;
    inputWhiteSlider.value = 255;
    outputBlackSlider.value = 0;
    outputWhiteSlider.value = 255;
    gammaSlider.value = 1.0;

    inputBlackValue.textContent = '0';
    inputWhiteValue.textContent = '255';
    outputBlackValue.textContent = '0';
    outputWhiteValue.textContent = '255';
    gammaValue.textContent = '1.00';

    if (currentImage && originalImageData) {
        originalCtx.drawImage(currentImage, 0, 0, originalCanvas.width, originalCanvas.height);
        originalImageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

        resultCtx.fillStyle = '#1a1a2e';
        resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
        resultCtx.fillStyle = '#22d3ee';
        resultCtx.font = '14px sans-serif';
        resultCtx.textAlign = 'center';
        resultCtx.fillText('Click "Apply Levels" to process', resultCanvas.width / 2, resultCanvas.height / 2);

        calculateHistogram();
    }

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    downloadBtn.disabled = true;
}

function downloadResult() {
    const link = document.createElement('a');
    link.download = 'levels-adjusted.png';
    link.href = resultCanvas.toDataURL('image/png');
    link.click();
}

// Event listeners
imageInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
        loadImage(e.target.files[0]);
    }
});

inputBlackSlider.addEventListener('input', function() {
    const val = parseInt(this.value);
    if (val >= parseInt(inputWhiteSlider.value)) {
        this.value = parseInt(inputWhiteSlider.value) - 1;
    }
    inputBlackValue.textContent = this.value;
    drawHistogram();
});

inputWhiteSlider.addEventListener('input', function() {
    const val = parseInt(this.value);
    if (val <= parseInt(inputBlackSlider.value)) {
        this.value = parseInt(inputBlackSlider.value) + 1;
    }
    inputWhiteValue.textContent = this.value;
    drawHistogram();
});

outputBlackSlider.addEventListener('input', function() {
    const val = parseInt(this.value);
    if (val >= parseInt(outputWhiteSlider.value)) {
        this.value = parseInt(outputWhiteSlider.value) - 1;
    }
    outputBlackValue.textContent = this.value;
});

outputWhiteSlider.addEventListener('input', function() {
    const val = parseInt(this.value);
    if (val <= parseInt(outputBlackSlider.value)) {
        this.value = parseInt(outputBlackSlider.value) + 1;
    }
    outputWhiteValue.textContent = this.value;
});

gammaSlider.addEventListener('input', function() {
    gammaValue.textContent = parseFloat(this.value).toFixed(2);
});

processBtn.addEventListener('click', processImage);
autoBtn.addEventListener('click', autoLevels);
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
        ctx.fillStyle = '#22d3ee';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Upload an image to begin', placeholderSize / 2, placeholderSize / 2);
    });

    // Empty histogram
    histogramCtx.fillStyle = '#1a1a2e';
    histogramCtx.fillRect(0, 0, histogramCanvas.width, histogramCanvas.height);
    histogramCtx.fillStyle = '#4a5a6a';
    histogramCtx.font = '12px sans-serif';
    histogramCtx.textAlign = 'center';
    histogramCtx.fillText('No image loaded', histogramCanvas.width / 2, histogramCanvas.height / 2);
}

initPlaceholder();
