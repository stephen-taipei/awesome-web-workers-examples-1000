// main.js

const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const originalCanvas = document.getElementById('originalCanvas');
const processedCanvas = document.getElementById('processedCanvas');
const originalCtx = originalCanvas.getContext('2d');
const processedCtx = processedCanvas.getContext('2d');
const originalHistogram = document.getElementById('originalHistogram');
const processedHistogram = document.getElementById('processedHistogram');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultContainer = document.getElementById('resultContainer');
const processingTimeDisplay = document.getElementById('processingTime');
const originalInfo = document.getElementById('originalInfo');
const processedInfo = document.getElementById('processedInfo');

let worker;
let originalImageData = null;

// Initialize Worker
if (window.Worker) {
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, data, histogram } = e.data;

        if (type === 'progress') {
            progressBar.style.width = `${data}%`;
            progressText.textContent = `Processing... ${Math.round(data)}%`;
        } else if (type === 'result') {
            const { imageData, time } = data;

            // Draw processed image
            processedCanvas.width = imageData.width;
            processedCanvas.height = imageData.height;
            processedCtx.putImageData(imageData, 0, 0);

            // Draw processed histogram
            if (e.data.histogram) {
                drawHistogram(processedHistogram, e.data.histogram);
            }

            // Update info
            processedInfo.textContent = `${imageData.width} x ${imageData.height}`;
            processingTimeDisplay.textContent = `${time.toFixed(2)} ms`;

            // UI updates
            progressContainer.classList.add('hidden');
            resultContainer.classList.remove('hidden');
            processBtn.disabled = false;
        }
    };
}

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
processBtn.addEventListener('click', startProcessing);
resetBtn.addEventListener('click', reset);
downloadBtn.addEventListener('click', downloadImage);

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        loadImage(file);
    }
}

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // Resize if too large for display/processing
            const maxWidth = 1920;
            const maxHeight = 1080;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }

            originalCanvas.width = width;
            originalCanvas.height = height;
            originalCtx.drawImage(img, 0, 0, width, height);

            originalImageData = originalCtx.getImageData(0, 0, width, height);

            // Calculate and draw original histogram
            const hist = calculateHistogram(originalImageData);
            drawHistogram(originalHistogram, hist);

            originalInfo.textContent = `${width} x ${height}`;
            processedCanvas.width = width;
            processedCanvas.height = height;
            processedCtx.clearRect(0, 0, width, height);

            processBtn.disabled = false;
            resultContainer.classList.add('hidden');

            // Clear processed histogram
            const pCtx = processedHistogram.getContext('2d');
            pCtx.fillStyle = '#000';
            pCtx.fillRect(0, 0, processedHistogram.width, processedHistogram.height);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function startProcessing() {
    if (!originalImageData || !worker) return;

    processBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting...';

    worker.postMessage({
        imageData: originalImageData
    });
}

function reset() {
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    processedCtx.clearRect(0, 0, processedCanvas.width, processedCanvas.height);
    originalInfo.textContent = 'No image loaded';
    processedInfo.textContent = '-';
    processBtn.disabled = true;
    resultContainer.classList.add('hidden');
    fileInput.value = '';

    // Clear histograms
    const oCtx = originalHistogram.getContext('2d');
    oCtx.fillStyle = '#000';
    oCtx.fillRect(0, 0, originalHistogram.width, originalHistogram.height);

    const pCtx = processedHistogram.getContext('2d');
    pCtx.fillStyle = '#000';
    pCtx.fillRect(0, 0, processedHistogram.width, processedHistogram.height);

    originalImageData = null;
}

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'equalized-image.png';
    link.href = processedCanvas.toDataURL();
    link.click();
}

// Simple histogram calculation for main thread display (pre-worker)
function calculateHistogram(imageData) {
    const data = imageData.data;
    const histogram = {
        r: new Array(256).fill(0),
        g: new Array(256).fill(0),
        b: new Array(256).fill(0)
    };

    for (let i = 0; i < data.length; i += 4) {
        histogram.r[data[i]]++;
        histogram.g[data[i + 1]]++;
        histogram.b[data[i + 2]]++;
    }
    return histogram;
}

function drawHistogram(canvas, histogram) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Find max value to normalize
    const max = Math.max(
        ...histogram.r,
        ...histogram.g,
        ...histogram.b
    );

    // Draw using composite operation to blend colors
    ctx.globalCompositeOperation = 'screen';

    // Draw Red
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    drawChannel(ctx, histogram.r, max, width, height);

    // Draw Green
    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
    drawChannel(ctx, histogram.g, max, width, height);

    // Draw Blue
    ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
    drawChannel(ctx, histogram.b, max, width, height);

    ctx.globalCompositeOperation = 'source-over';
}

function drawChannel(ctx, data, max, width, height) {
    const barWidth = width / 256;
    for (let i = 0; i < 256; i++) {
        const h = (data[i] / max) * height;
        ctx.fillRect(i * barWidth, height - h, barWidth, h);
    }
}
