// Gamma Correction - Main Thread

const imageInput = document.getElementById('imageInput');
const gammaSlider = document.getElementById('gammaSlider');
const gammaValue = document.getElementById('gammaValue');
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
const gammaAppliedEl = document.getElementById('gammaApplied');

const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const curveCanvas = document.getElementById('curveCanvas');
const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const curveCtx = curveCanvas.getContext('2d');

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
    gammaAppliedEl.textContent = data.gamma.toFixed(2);

    downloadBtn.disabled = false;
    processBtn.disabled = false;
}

function drawGammaCurve(gamma) {
    const w = curveCanvas.width;
    const h = curveCanvas.height;
    const padding = 20;

    // Clear
    curveCtx.fillStyle = '#1a1a2e';
    curveCtx.fillRect(0, 0, w, h);

    // Draw grid
    curveCtx.strokeStyle = '#2a3a4a';
    curveCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const x = padding + (i / 4) * (w - 2 * padding);
        const y = padding + (i / 4) * (h - 2 * padding);
        curveCtx.beginPath();
        curveCtx.moveTo(x, padding);
        curveCtx.lineTo(x, h - padding);
        curveCtx.stroke();
        curveCtx.beginPath();
        curveCtx.moveTo(padding, y);
        curveCtx.lineTo(w - padding, y);
        curveCtx.stroke();
    }

    // Draw diagonal (linear reference)
    curveCtx.strokeStyle = '#4a5a6a';
    curveCtx.setLineDash([5, 5]);
    curveCtx.beginPath();
    curveCtx.moveTo(padding, h - padding);
    curveCtx.lineTo(w - padding, padding);
    curveCtx.stroke();
    curveCtx.setLineDash([]);

    // Draw gamma curve
    curveCtx.strokeStyle = '#8b5cf6';
    curveCtx.lineWidth = 2;
    curveCtx.beginPath();

    for (let i = 0; i <= 100; i++) {
        const input = i / 100;
        const output = Math.pow(input, gamma);

        const x = padding + input * (w - 2 * padding);
        const y = h - padding - output * (h - 2 * padding);

        if (i === 0) {
            curveCtx.moveTo(x, y);
        } else {
            curveCtx.lineTo(x, y);
        }
    }
    curveCtx.stroke();

    // Labels
    curveCtx.fillStyle = '#a78bfa';
    curveCtx.font = '10px sans-serif';
    curveCtx.textAlign = 'center';
    curveCtx.fillText('Input', w / 2, h - 5);
    curveCtx.save();
    curveCtx.translate(10, h / 2);
    curveCtx.rotate(-Math.PI / 2);
    curveCtx.fillText('Output', 0, 0);
    curveCtx.restore();

    // Gamma value label
    curveCtx.fillStyle = '#c4b5fd';
    curveCtx.font = '12px sans-serif';
    curveCtx.textAlign = 'right';
    curveCtx.fillText(`γ = ${gamma.toFixed(2)}`, w - 25, 35);
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
            resultCtx.fillStyle = '#a78bfa';
            resultCtx.font = '14px sans-serif';
            resultCtx.textAlign = 'center';
            resultCtx.fillText('Click "Apply Gamma" to process', width / 2, height / 2);

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

    const gamma = parseFloat(gammaSlider.value);

    processBtn.disabled = true;
    downloadBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';

    initWorker();
    worker.postMessage({
        imageData: originalImageData.data.buffer,
        width: originalImageData.width,
        height: originalImageData.height,
        gamma: gamma
    }, [originalImageData.data.buffer.slice(0)]);
}

function reset() {
    if (worker) {
        worker.terminate();
        worker = null;
    }

    gammaSlider.value = 1.0;
    gammaValue.textContent = '1.00';
    drawGammaCurve(1.0);

    if (currentImage && originalImageData) {
        // Redraw original
        originalCtx.drawImage(currentImage, 0, 0, originalCanvas.width, originalCanvas.height);
        originalImageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

        resultCtx.fillStyle = '#1a1a2e';
        resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
        resultCtx.fillStyle = '#a78bfa';
        resultCtx.font = '14px sans-serif';
        resultCtx.textAlign = 'center';
        resultCtx.fillText('Click "Apply Gamma" to process', resultCanvas.width / 2, resultCanvas.height / 2);
    }

    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    downloadBtn.disabled = true;
}

function downloadResult() {
    const link = document.createElement('a');
    link.download = `gamma-${parseFloat(gammaSlider.value).toFixed(2)}.png`;
    link.href = resultCanvas.toDataURL('image/png');
    link.click();
}

// Event listeners
imageInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
        loadImage(e.target.files[0]);
    }
});

gammaSlider.addEventListener('input', function() {
    const gamma = parseFloat(this.value);
    gammaValue.textContent = gamma.toFixed(2);
    drawGammaCurve(gamma);
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
        ctx.fillStyle = '#a78bfa';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Upload an image to begin', placeholderSize / 2, placeholderSize / 2);
    });

    drawGammaCurve(1.0);
}

initPlaceholder();
