const imageInput = document.getElementById('imageInput');
const modeSelect = document.getElementById('mode');
const clipSlider = document.getElementById('clipPercent');
const clipVal = document.getElementById('clipVal');
const gammaSlider = document.getElementById('gammaCorrect');
const gammaVal = document.getElementById('gammaVal');
const applyBtn = document.getElementById('applyBtn');
const resetBtn = document.getElementById('resetBtn');
const statusText = document.getElementById('statusText');
const timeValEl = document.getElementById('timeVal');
const inputRange = document.getElementById('inputRange');
const outputRange = document.getElementById('outputRange');

const originalCanvas = document.getElementById('originalCanvas');
const resultCanvas = document.getElementById('resultCanvas');
const histBeforeCanvas = document.getElementById('histBefore');
const histAfterCanvas = document.getElementById('histAfter');

const originalCtx = originalCanvas.getContext('2d');
const resultCtx = resultCanvas.getContext('2d');
const histBeforeCtx = histBeforeCanvas.getContext('2d');
const histAfterCtx = histAfterCanvas.getContext('2d');

let worker;
let originalImageData = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'result') {
            statusText.textContent = 'Completed';
            timeValEl.textContent = `${data.duration}ms`;
            inputRange.textContent = `${data.inputMin} - ${data.inputMax}`;
            outputRange.textContent = `${data.outputMin} - ${data.outputMax}`;

            // Display result
            const resultData = new ImageData(
                new Uint8ClampedArray(data.imageData),
                data.width,
                data.height
            );
            resultCtx.putImageData(resultData, 0, 0);

            // Draw histograms
            drawHistogram(histBeforeCtx, data.histogramBefore, '#888');
            drawHistogram(histAfterCtx, data.histogramAfter, '#4caf50');

            applyBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            applyBtn.disabled = false;
        }
    };
}

function drawHistogram(ctx, histData, color) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    const histogram = new Uint32Array(histData);
    const max = Math.max(...histogram);

    if (max === 0) return;

    ctx.fillStyle = color;
    for (let i = 0; i < 256; i++) {
        const barHeight = (histogram[i] / max) * height;
        ctx.fillRect(i, height - barHeight, 1, barHeight);
    }
}

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
        const maxSize = 1920;
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

        originalCtx.drawImage(img, 0, 0, width, height);
        resultCtx.drawImage(img, 0, 0, width, height);

        originalImageData = originalCtx.getImageData(0, 0, width, height);

        // Clear histograms
        histBeforeCtx.fillStyle = '#1a1a2e';
        histBeforeCtx.fillRect(0, 0, 256, 100);
        histAfterCtx.fillStyle = '#1a1a2e';
        histAfterCtx.fillRect(0, 0, 256, 100);

        applyBtn.disabled = false;
        resetBtn.disabled = false;
    };
    img.src = URL.createObjectURL(file);
});

clipSlider.addEventListener('input', () => {
    clipVal.textContent = `${clipSlider.value}%`;
});

gammaSlider.addEventListener('input', () => {
    gammaVal.textContent = (gammaSlider.value / 100).toFixed(2);
});

applyBtn.addEventListener('click', () => {
    if (!originalImageData) return;
    if (!worker) initWorker();

    applyBtn.disabled = true;
    statusText.textContent = 'Processing...';
    timeValEl.textContent = '-';
    inputRange.textContent = '-';
    outputRange.textContent = '-';

    const dataBuffer = originalImageData.data.buffer.slice(0);

    worker.postMessage({
        command: 'autoLevels',
        imageData: dataBuffer,
        width: originalImageData.width,
        height: originalImageData.height,
        mode: modeSelect.value,
        clipPercent: parseFloat(clipSlider.value),
        gamma: gammaSlider.value / 100
    }, [dataBuffer]);
});

resetBtn.addEventListener('click', () => {
    if (!originalImageData) return;
    resultCtx.putImageData(originalImageData, 0, 0);
    statusText.textContent = 'Reset';

    histBeforeCtx.fillStyle = '#1a1a2e';
    histBeforeCtx.fillRect(0, 0, 256, 100);
    histAfterCtx.fillStyle = '#1a1a2e';
    histAfterCtx.fillRect(0, 0, 256, 100);
});

initWorker();
